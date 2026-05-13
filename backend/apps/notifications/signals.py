from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from apps.bookings.models import Booking
from apps.payments.models import Payment
from apps.reviews.models import Review
from .services import (
    notify_admin_new_registration,
    notify_user_registration_success,
    notify_booking_confirmed,
    notify_provider_new_booking,
    notify_payment_success,
    notify_provider_payment_received
)

User = get_user_model()


@receiver(post_save, sender=User)
def handle_user_registration(sender, instance, created, **kwargs):
    """Send notifications when a new user registers"""
    if created and instance.role in ['customer', 'provider']:
        # Notify user of successful registration
        notify_user_registration_success(instance)

        # Notify admins of new registration
        notify_admin_new_registration(instance, instance.role)


@receiver(post_save, sender=Booking)
def handle_booking_events(sender, instance, created, **kwargs):
    """Send notifications for booking events"""
    if created:
        # New booking created - notify provider
        notify_provider_new_booking(instance)

        # For now, booking is confirmed immediately (could be changed to pending approval)
        notify_booking_confirmed(instance)


@receiver(post_save, sender=Payment)
def handle_payment_events(sender, instance, created, **kwargs):
    """Send notifications for payment events"""
    if not created and instance.status == 'captured':
        # Payment was captured - notify user
        notify_payment_success(instance)


@receiver(post_save, sender=Review)
def handle_review_events(sender, instance, created, **kwargs):
    """Send notifications for new reviews"""
    if created:
        from .services import NotificationService

        # Notify provider of new review
        NotificationService.send_notification(
            recipient_id=instance.provider.user.id,
            recipient_role='provider',
            notification_type='provider_new_review',
            title='New Review Received',
            message=f'You received a {instance.rating}-star review from {instance.customer.full_name}.',
            metadata={
                'review_id': instance.id,
                'rating': instance.rating,
                'customer_name': instance.customer.full_name,
                'booking_id': instance.booking.id if instance.booking else None
            },
            related_user=instance.customer
        )