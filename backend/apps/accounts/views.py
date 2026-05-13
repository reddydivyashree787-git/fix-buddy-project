import pyotp
import qrcode
import base64
import random
from io import BytesIO
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, ServiceProvider, ProviderAvailability, LoginActivity
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    ServiceProviderSerializer, ServiceProviderUpdateSerializer,
    ProviderAvailabilitySerializer
)

def log_activity(user, request, login_status='success'):
    ip = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    LoginActivity.objects.create(user=user, ip_address=ip, user_agent=user_agent, status=login_status)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_activity(user, request, 'success')
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)

class LoginView(generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        totp_code = request.data.get('totp_code')
        if user.is_2fa_enabled:
            if not totp_code:
                log_activity(user, request, 'failed')
                return Response({'error': '2FA required', 'require_2fa': True}, status=403)
            totp = pyotp.TOTP(user.two_factor_secret)
            if not totp.verify(totp_code):
                log_activity(user, request, 'failed')
                return Response({'error': 'Invalid 2FA code'}, status=400)
        
        log_activity(user, request, 'success')
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'message': 'Login successful'
        })

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class ProviderProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ServiceProviderUpdateSerializer
        return ServiceProviderSerializer

    def get_object(self):
        provider, _ = ServiceProvider.objects.get_or_create(user=self.request.user)
        return provider

class ProviderListView(generics.ListAPIView):
    serializer_class = ServiceProviderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = ServiceProvider.objects.filter(user__is_active=True).select_related('user')
        city = self.request.query_params.get('city')
        min_rating = self.request.query_params.get('min_rating')
        max_rate = self.request.query_params.get('max_rate')
        sort_by = self.request.query_params.get('sort_by', '-average_rating')

        if city:
            qs = qs.filter(user__city__icontains=city)
        if min_rating:
            qs = qs.filter(average_rating__gte=float(min_rating))
        if max_rate:
            qs = qs.filter(hourly_rate__lte=float(max_rate))
        return qs.order_by(sort_by)

class ProviderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ServiceProviderSerializer
    queryset = ServiceProvider.objects.all()

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]
        
    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update providers")
        serializer.save()

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def set_availability(request):
    provider = ServiceProvider.objects.get(user=request.user)
    serializer = ProviderAvailabilitySerializer(data=request.data, many=True)
    serializer.is_valid(raise_exception=True)
    ProviderAvailability.objects.filter(provider=provider).delete()
    for item in serializer.validated_data:
        ProviderAvailability.objects.create(provider=provider, **item)
    return Response({'message': 'Availability updated successfully'})

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def all_providers(request):
    providers = ServiceProvider.objects.filter(
        user__is_active=True, is_available=True
    ).select_related('user').order_by('-average_rating')[:20]
    return Response(ServiceProviderSerializer(providers, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_users(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=403)
    users = User.objects.select_related().order_by('-created_at')[:50]
    return Response(UserSerializer(users, many=True).data)


# ─── New Auth Features ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def social_login(request):
    provider = request.data.get('provider')
    token = request.data.get('token')
    role = request.data.get('role', 'customer')

    if provider == 'google':
        try:
            client_id = getattr(settings, 'GOOGLE_CLIENT_ID', os.getenv('REACT_APP_GOOGLE_CLIENT_ID'))
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
            email = idinfo['email']
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            profile_image = idinfo.get('picture', '')
            
            user, created = User.objects.get_or_create(email=email, defaults={
                'first_name': first_name,
                'last_name': last_name,
                'role': role,
                'auth_provider': 'google',
            })
            
            if created and role == 'provider':
                ServiceProvider.objects.create(user=user)
                
            log_activity(user, request, 'success')
            tokens = get_tokens_for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens,
                'message': 'Login successful'
            })
        except ValueError:
            return Response({'error': 'Invalid token'}, status=400)
    
    # Facebook could be added here
    return Response({'error': 'Provider not supported or token invalid'}, status=400)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def forgot_password(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email=email)
        otp = str(random.randint(100000, 999999))
        user.reset_password_otp = otp
        user.reset_password_otp_expiry = timezone.now() + timedelta(minutes=15)
        user.save()
        
        send_mail(
            'Password Reset OTP',
            f'Your OTP for password reset is {otp}. It is valid for 15 minutes.',
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@fixbuddy.com'),
            [user.email],
            fail_silently=False,
        )
        return Response({'message': 'OTP sent to your email.'})
    except User.DoesNotExist:
        return Response({'message': 'If an account exists with this email, an OTP has been sent.'}) # Prevent email enumeration

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reset_password(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    new_password = request.data.get('password')
    
    try:
        user = User.objects.get(email=email, reset_password_otp=otp)
        if user.reset_password_otp_expiry and user.reset_password_otp_expiry > timezone.now():
            user.set_password(new_password)
            user.reset_password_otp = None
            user.reset_password_otp_expiry = None
            user.save()
            return Response({'message': 'Password reset successfully.'})
        return Response({'error': 'OTP expired.'}, status=400)
    except User.DoesNotExist:
        return Response({'error': 'Invalid email or OTP.'}, status=400)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if user.check_password(old_password):
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully.'})
    return Response({'error': 'Incorrect old password.'}, status=400)

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_account(request):
    user = request.user
    user.is_active = False
    user.save()
    return Response({'message': 'Account deleted successfully.'}, status=204)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def setup_2fa(request):
    user = request.user
    if user.role != 'admin':
        return Response({'error': 'Only admins can setup 2FA'}, status=403)
        
    secret = pyotp.random_base32()
    user.two_factor_secret = secret
    user.save()
    
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="FixBuddy Admin")
    
    qr = qrcode.make(provisioning_uri)
    buf = BytesIO()
    qr.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    return Response({
        'secret': secret,
        'qr_code': f"data:image/png;base64,{qr_b64}"
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_setup_2fa(request):
    user = request.user
    totp_code = request.data.get('totp_code')
    
    if not user.two_factor_secret:
        return Response({'error': '2FA not initialized'}, status=400)
        
    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(totp_code):
        user.is_2fa_enabled = True
        user.save()
        return Response({'message': '2FA enabled successfully'})
    return Response({'error': 'Invalid code'}, status=400)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def login_activity(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=403)
    activities = LoginActivity.objects.order_by('-timestamp')[:50]
    data = [{
        'email': a.user.email,
        'ip_address': a.ip_address,
        'user_agent': a.user_agent,
        'status': a.status,
        'timestamp': a.timestamp
    } for a in activities]
    return Response(data)
