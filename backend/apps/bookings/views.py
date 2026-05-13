from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from .models import Booking, EmergencyBooking, BookingStatusHistory
from .serializers import (
    BookingSerializer, BookingCreateSerializer,
    EmergencyBookingSerializer
)
from apps.accounts.models import ServiceProvider
from apps.services.models import ServiceSubCategory
from apps.notifications.models import Notification
import math


def create_notification(user, notification_type, title, message, booking=None):
    """Helper function to create notifications."""
    Notification.objects.create(
        recipient=user,
        recipient_role=user.role,
        notification_type=notification_type,
        title=title,
        message=message,
        related_booking=booking
    )


def find_nearest_available_provider(subcategory_id, lat=None, lon=None):
    """Find nearest available provider for emergency bookings."""
    from apps.services.models import ProviderService
    providers = ProviderService.objects.filter(
        subcategory_id=subcategory_id,
        is_active=True,
        provider__is_available=True,
        provider__user__is_active=True,
    ).select_related('provider__user').order_by('-provider__average_rating')

    if lat and lon:
        def dist(ps):
            p = ps.provider
            if p.user.latitude and p.user.longitude:
                return math.sqrt((p.user.latitude - lat)**2 + (p.user.longitude - lon)**2)
            return 9999
        providers = sorted(providers, key=dist)

    return providers[0].provider if providers else None


class BookingListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BookingCreateSerializer
        return BookingSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            qs = Booking.objects.all()
        elif user.role == 'provider':
            qs = Booking.objects.filter(provider__user=user).exclude(status='awaiting_payment')
        else:
            qs = Booking.objects.filter(customer=user)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.select_related('customer', 'provider__user', 'subcategory__category')

    def perform_create(self, serializer):
        payment_method = serializer.validated_data.get('payment_method', 'online')
        initial_status = 'awaiting_payment' if payment_method == 'online' else 'pending'
        
        booking = serializer.save(customer=self.request.user, status=initial_status)
        BookingStatusHistory.objects.create(
            booking=booking, status=initial_status, changed_by=self.request.user
        )
        
        if initial_status == 'pending':
            create_notification(
                user=booking.provider.user,
                notification_type='booking_created',
                title='New Booking Received',
                message=f'You have a new booking from {booking.customer.full_name} for {booking.subcategory.name}.',
                booking=booking
            )


class BookingDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Booking.objects.all()
        elif user.role == 'provider':
            return Booking.objects.filter(provider__user=user).exclude(status='awaiting_payment')
        return Booking.objects.filter(customer=user)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_booking_status(request, pk):
    """Update booking status (provider/admin/customer)."""
    user = request.user
    try:
        if user.role == 'admin':
            booking = Booking.objects.get(pk=pk)
        elif user.role == 'provider':
            booking = Booking.objects.get(pk=pk, provider__user=user)
        elif user.role == 'customer':
            booking = Booking.objects.get(pk=pk, customer=user)
        else:
            return Response({'error': 'Permission denied'}, status=403)
    except Booking.DoesNotExist:
        return Response({'error': f'Booking #{pk} not found for your account.'}, status=404)

    new_status = request.data.get('status')

    # Define what each role is allowed to do
    role_allowed = {
        'customer': ['cancelled'],
        'provider': ['accepted', 'rejected', 'in_progress', 'completed', 'cancelled'],
        'admin':    ['accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'pending'],
    }

    if new_status not in role_allowed.get(user.role, []):
        return Response(
            {'error': f'Your role cannot set status to "{new_status}".'},
            status=403
        )

    valid_transitions = {
        'awaiting_payment': ['pending', 'cancelled'],
        'pending':     ['accepted', 'rejected', 'cancelled'],
        'accepted':    ['in_progress', 'cancelled'],
        'in_progress': ['completed', 'cancelled'],
        'completed':   [],
        'cancelled':   [],
        'rejected':    [],
    }

    if new_status not in valid_transitions.get(booking.status, []):
        return Response(
            {'error': f'Cannot change status from "{booking.status}" to "{new_status}".'},
            status=400
        )

    booking.status = new_status
    if new_status == 'completed':
        if booking.payment_method == 'offline' and user.role == 'provider':
            return Response(
                {'error': 'Commission payment is required before marking an offline booking as completed. Please use the payment flow.'},
                status=400
            )
        booking.final_price = request.data.get('final_price', booking.quoted_price)
        provider = booking.provider
        provider.total_bookings_completed += 1
        provider.save()
        
        # Create pending payout if online payment and payout amount is greater than zero
        if hasattr(booking, 'payment') and booking.payment.status == 'captured':
            from apps.payments.models import Payout
            bank_account = getattr(booking.provider, 'bank_account', None)
            if booking.payment.provider_payout_amount > 0 and not hasattr(booking.payment, 'payout'):
                Payout.objects.create(
                    payment=booking.payment,
                    provider=booking.provider,
                    bank_account=bank_account,
                    amount=booking.payment.provider_payout_amount,
                    status='pending'
                )

    elif new_status == 'cancelled':
        # Process refund if online payment was captured
        if hasattr(booking, 'payment') and booking.payment.payment_method in ['razorpay', 'card'] and booking.payment.status == 'captured':
            from apps.payments.models import Refund, PaymentTransaction
            from apps.payments.razorpay_service import RazorpayService
            import logging
            
            if not hasattr(booking.payment, 'refund') or booking.payment.refund.status in ['failed', 'pending']:
                try:
                    rzp_service = RazorpayService()
                    # Razorpay refund
                    refund_response = rzp_service.process_refund(
                        payment_id=booking.payment.razorpay_payment_id,
                        amount_in_inr=booking.payment.amount,
                        notes={'booking_id': str(booking.id), 'reason': 'Booking cancelled'}
                    )
                    
                    refund_record, created = Refund.objects.get_or_create(
                        payment=booking.payment,
                        booking=booking,
                        defaults={
                            'amount': booking.payment.amount,
                            'reason': request.data.get('note', 'Booking cancelled'),
                            'status': 'initiated',
                            'created_by': request.user
                        }
                    )
                    if not created:
                        refund_record.status = 'initiated'
                        refund_record.reason = request.data.get('note', 'Booking cancelled')
                    
                    refund_record.razorpay_refund_id = refund_response.get('id')
                    refund_record.save()
                    
                    PaymentTransaction.objects.create(
                        payment=booking.payment,
                        transaction_type='refund_initiated',
                        amount=booking.payment.amount,
                        description=f"Refund initiated for booking {booking.id}",
                        razorpay_response=refund_response,
                        status='initiated'
                    )
                    booking.payment.status = 'refunded'
                    booking.payment.save()
                except Exception as e:
                    logging.getLogger(__name__).error(f"Failed to process refund for booking {booking.id}: {str(e)}")

    booking.save()

    BookingStatusHistory.objects.create(
        booking=booking,
        status=new_status,
        changed_by=request.user,
        note=request.data.get('note', '')
    )

    if new_status in ['accepted', 'rejected', 'in_progress', 'completed']:
        status_messages = {
            'accepted': 'Your booking has been accepted by the provider.',
            'rejected': 'Your booking has been rejected by the provider.',
            'in_progress': 'Your booking is now in progress.',
            'completed': 'Your booking has been completed.',
        }
        create_notification(
            user=booking.customer,
            notification_type='booking_status_changed',
            title=f'Booking #{booking.id} Status Updated',
            message=status_messages.get(new_status, f'Booking status changed to {new_status}.'),
            booking=booking
        )

    return Response(BookingSerializer(booking).data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_emergency_booking(request):
    """Create an emergency booking and auto-assign nearest provider."""
    serializer = EmergencyBookingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    lat = request.data.get('latitude')
    lon = request.data.get('longitude')
    subcategory_id = request.data.get('subcategory')

    provider = find_nearest_available_provider(
        subcategory_id,
        float(lat) if lat else None,
        float(lon) if lon else None
    )

    emergency = serializer.save(
        customer=request.user,
        provider=provider,
        status='assigned' if provider else 'searching'
    )

    return Response(EmergencyBookingSerializer(emergency).data, status=201)


class EmergencyBookingListView(generics.ListAPIView):
    serializer_class = EmergencyBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return EmergencyBooking.objects.all()
        elif user.role == 'provider':
            return EmergencyBooking.objects.filter(provider__user=user)
        return EmergencyBooking.objects.filter(customer=user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def booking_analytics(request):
    """Admin analytics endpoint."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=403)

    from django.db.models import Count, Avg, Sum
    total = Booking.objects.count()
    by_status = Booking.objects.values('status').annotate(count=Count('id'))
    emergency_count = EmergencyBooking.objects.count()
    revenue_data = Booking.objects.filter(status='completed').aggregate(avg=Avg('final_price'), total=Sum('final_price'))

    return Response({
        'total_bookings': total,
        'by_status': list(by_status),
        'emergency_bookings': emergency_count,
        'average_completed_price': revenue_data['avg'],
        'total_revenue': revenue_data['total'] or 0,
    })
    return Response({'message': 'All notifications marked as read'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_notification_count(request):
    """Get count of unread notifications."""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})
