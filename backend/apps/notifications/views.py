from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer, SendNotificationSerializer
from .services import NotificationService
from apps.bookings.models import Booking
from apps.payments.models import Payout
from apps.accounts.models import ServiceProvider


class NotificationPagination(PageNumberPagination):
    """Custom pagination for notifications"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'is_read']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'is_read']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter notifications based on user role and permissions"""
        user = self.request.user

        # Admins can see all notifications
        if user.role == 'admin':
            return Notification.objects.all().select_related('recipient')

        # Users can only see their own notifications
        return Notification.objects.filter(
            recipient=user,
            recipient_role=user.role
        ).exclude(  # Exclude expired notifications
            Q(expires_at__lt=timezone.now()) & Q(expires_at__isnull=False)
        )

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications for current user"""
        user = request.user
        count = NotificationService.get_unread_count(user.id, user.role)
        return Response({'unread_count': count})

    @action(detail=False, methods=['get'])
    def admin_summary(self, request):
        """Get summarized pending actions for admin dashboard"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
            
        pending_bookings = Booking.objects.filter(status='pending').count()
        pending_payouts = Payout.objects.filter(status='pending').count()
        pending_providers = ServiceProvider.objects.filter(is_verified=False).count()
        
        notifications = []
        if pending_bookings > 0:
            notifications.append({
                'id': 'booking', 'type': 'booking', 
                'message': f"{pending_bookings} new bookings pending approval", 
                'time': 'Action Required', 'unread': True, 'path': '/admin/bookings'
            })
        if pending_payouts > 0:
            notifications.append({
                'id': 'payout', 'type': 'payout', 
                'message': f"{pending_payouts} pending payouts to process", 
                'time': 'Action Required', 'unread': True, 'path': '/admin/payouts'
            })
        if pending_providers > 0:
            notifications.append({
                'id': 'provider', 'type': 'provider', 
                'message': f"{pending_providers} providers pending verification", 
                'time': 'Action Required', 'unread': True, 'path': '/admin/providers'
            })
            
        return Response(notifications)

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        user = request.user
        updated_count = NotificationService.mark_all_as_read(user.id, user.role)
        return Response({
            'message': f'Marked {updated_count} notifications as read',
            'updated_count': updated_count
        })

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a specific notification as read"""
        notification = self.get_object()

        # Check permissions
        if notification.recipient != request.user and request.user.role != 'admin':
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def delete_notification(self, request, pk=None):
        """Delete a specific notification"""
        notification = self.get_object()

        # Check permissions
        if notification.recipient != request.user and request.user.role != 'admin':
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        notification.delete()
        return Response({'message': 'Notification deleted'})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification preferences
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only manage their own preferences"""
        return NotificationPreference.objects.filter(user=self.request.user)

    def get_object(self):
        """Get or create preferences for current user"""
        obj, created = NotificationPreference.objects.get_or_create(user=self.request.user)
        return obj

    def list(self, request):
        """Get notification preferences for current user"""
        preference = self.get_object()
        serializer = self.get_serializer(preference)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """Update notification preferences for current user"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_notification(request):
    """
    Internal endpoint to send notifications (admin only)
    POST /api/notifications/send/
    """
    if request.user.role != 'admin':
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = SendNotificationSerializer(data=request.data)
    if serializer.is_valid():
        try:
            notification = NotificationService.send_notification(
                recipient_id=serializer.validated_data['recipient_id'],
                recipient_role=serializer.validated_data['recipient_role'],
                notification_type=serializer.validated_data['notification_type'],
                title=serializer.validated_data['title'],
                message=serializer.validated_data['message'],
                metadata=serializer.validated_data.get('metadata', {}),
                expires_at=serializer.validated_data.get('expires_at')
            )
            return Response({
                'message': 'Notification sent successfully',
                'notification_id': notification.id
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Failed to send notification: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)