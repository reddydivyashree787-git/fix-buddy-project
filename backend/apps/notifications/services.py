from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
import json
import logging

try:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    CHANNELS_AVAILABLE = True
except ImportError:
    CHANNELS_AVAILABLE = False

from .models import Notification, NotificationPreference

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    """
    Centralized service for creating and sending notifications across the platform
    """

    @staticmethod
    def send_notification(recipient_id, recipient_role, notification_type, title, message,
                         metadata=None, related_booking=None, related_payment=None,
                         related_user=None, expires_at=None):
        """
        Create and send a notification to a user

        Args:
            recipient_id: User ID of the recipient
            recipient_role: Role of the recipient (customer, provider, admin)
            notification_type: Type of notification from NOTIFICATION_TYPES
            title: Short title for the notification
            message: Full message content
            metadata: Optional JSON metadata
            related_booking: Optional related booking instance
            related_payment: Optional related payment instance
            related_user: Optional related user instance
            expires_at: Optional expiration datetime
        """
        try:
            with transaction.atomic():
                # Create notification
                notification = Notification.objects.create(
                    recipient_id=recipient_id,
                    recipient_role=recipient_role,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    metadata=metadata or {},
                    related_booking=related_booking,
                    related_payment=related_payment,
                    related_user=related_user,
                    expires_at=expires_at
                )

                # Send real-time notification via WebSocket
                NotificationService._send_realtime_notification(notification)

                # Send email/SMS based on user preferences (if configured)
                NotificationService._send_external_notifications(notification)

                logger.info(f"Notification sent: {notification_type} to {recipient_id}")
                return notification

        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")
            raise

    @staticmethod
    def send_bulk_notifications(recipients, notification_type, title, message, metadata=None):
        """
        Send the same notification to multiple recipients

        Args:
            recipients: List of dicts with 'user_id' and 'role'
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            metadata: Optional metadata
        """
        notifications = []
        for recipient in recipients:
            try:
                notification = NotificationService.send_notification(
                    recipient_id=recipient['user_id'],
                    recipient_role=recipient['role'],
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    metadata=metadata
                )
                notifications.append(notification)
            except Exception as e:
                logger.error(f"Failed to send bulk notification to {recipient}: {str(e)}")

        return notifications

    @staticmethod
    def _send_realtime_notification(notification):
        """
        Send notification via WebSocket to connected clients
        """
        if not CHANNELS_AVAILABLE:
            return

        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{notification.recipient_role}_{notification.recipient_id}',
                    {
                        'type': 'notification_message',
                        'notification': {
                            'id': str(notification.id),
                            'type': notification.notification_type,
                            'title': notification.title,
                            'message': notification.message,
                            'metadata': notification.metadata,
                            'created_at': notification.created_at.isoformat(),
                            'is_read': notification.is_read
                        }
                    }
                )
        except Exception as e:
            logger.error(f"Failed to send realtime notification: {str(e)}")

    @staticmethod
    def _send_external_notifications(notification):
        """
        Send email/SMS notifications based on user preferences
        """
        try:
            # Get user preferences
            preferences = NotificationPreference.objects.filter(user=notification.recipient).first()
            if not preferences:
                # Create default preferences if none exist
                preferences = NotificationPreference.objects.create(user=notification.recipient)

            # Send email if enabled
            if preferences.email_enabled and not notification.is_email_sent:
                NotificationService._send_email_notification(notification, preferences)

            # Send SMS if enabled
            if preferences.sms_enabled and not notification.is_sms_sent:
                NotificationService._send_sms_notification(notification, preferences)

        except Exception as e:
            logger.error(f"Failed to send external notifications: {str(e)}")

    @staticmethod
    def _send_email_notification(notification, preferences):
        """
        Send email notification using Django's email backend asynchronously
        """
        import threading
        from django.core.mail import send_mail
        from django.conf import settings

        def send_async():
            try:
                send_mail(
                    subject=notification.title,
                    message=notification.message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@fixbuddy.com'),
                    recipient_list=[notification.recipient.email],
                    fail_silently=False,
                )
                
                notification.is_email_sent = True
                notification.save(update_fields=['is_email_sent'])
                logger.info(f"Email notification sent to {notification.recipient.email}")
            except Exception as e:
                logger.error(f"Failed to send email to {notification.recipient.email}: {str(e)}")

        threading.Thread(target=send_async).start()

    @staticmethod
    def _send_sms_notification(notification, preferences):
        """
        Send SMS notification (placeholder - integrate with SMS service)
        """
        # TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        # For now, just mark as sent
        notification.is_sms_sent = True
        notification.save(update_fields=['is_sms_sent'])
        logger.info(f"SMS notification queued for {notification.recipient.phone}")

    @staticmethod
    def get_unread_count(user_id, role):
        """
        Get count of unread notifications for a user
        """
        return Notification.objects.filter(
            recipient_id=user_id,
            recipient_role=role,
            is_read=False
        ).exclude(
            expires_at__lt=timezone.now()
        ).count()

    @staticmethod
    def mark_all_as_read(user_id, role):
        """
        Mark all notifications as read for a user
        """
        return Notification.objects.filter(
            recipient_id=user_id,
            recipient_role=role,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

    @staticmethod
    def cleanup_expired_notifications():
        """
        Delete expired notifications (run as a periodic task)
        """
        expired_count = Notification.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        logger.info(f"Cleaned up {expired_count[0]} expired notifications")
        return expired_count[0]


# Convenience functions for common notification types

def notify_admin_new_registration(user, role):
    """Notify admin of new user/provider registration"""
    admin_users = User.objects.filter(role='admin', is_active=True)
    for admin in admin_users:
        NotificationService.send_notification(
            recipient_id=admin.id,
            recipient_role='admin',
            notification_type=f'admin_{role}_registration',
            title=f'New {role.title()} Registration',
            message=f'{user.full_name} ({user.email}) has registered as a {role}.',
            metadata={'user_id': user.id, 'user_email': user.email}
        )

def notify_user_registration_success(user):
    """Notify user of successful registration"""
    NotificationService.send_notification(
        recipient_id=user.id,
        recipient_role=user.role,
        notification_type='user_registration_success',
        title='Welcome to HomeServices!',
        message='Your account has been created successfully. You can now book services or start providing them.',
        metadata={'user_id': user.id}
    )

def notify_booking_confirmed(booking):
    """Notify user of booking confirmation"""
    NotificationService.send_notification(
        recipient_id=booking.customer.id,
        recipient_role='customer',
        notification_type='user_booking_confirmed',
        title='Booking Confirmed',
        message=f'Your booking for {booking.subcategory.name} with {booking.provider.user.full_name} has been confirmed.',
        metadata={
            'booking_id': booking.id,
            'provider_name': booking.provider.user.full_name,
            'service': booking.subcategory.name,
            'date': booking.booking_date.isoformat(),
            'time': booking.booking_time.isoformat()
        },
        related_booking=booking
    )

def notify_provider_new_booking(booking):
    """Notify provider of new booking"""
    NotificationService.send_notification(
        recipient_id=booking.provider.user.id,
        recipient_role='provider',
        notification_type='provider_new_booking',
        title='New Booking Received',
        message=f'You have a new booking from {booking.customer.full_name} for {booking.subcategory.name}.',
        metadata={
            'booking_id': booking.id,
            'customer_name': booking.customer.full_name,
            'service': booking.subcategory.name,
            'date': booking.booking_date.isoformat(),
            'time': booking.booking_time.isoformat()
        },
        related_booking=booking
    )

def notify_payment_success(payment):
    """Notify user of successful payment"""
    NotificationService.send_notification(
        recipient_id=payment.customer.id,
        recipient_role='customer',
        notification_type='user_payment_success',
        title='Payment Successful',
        message=f'Your payment of ₹{payment.amount} for booking #{payment.booking.id} has been processed successfully.',
        metadata={
            'payment_id': payment.id,
            'booking_id': payment.booking.id,
            'amount': str(payment.amount)
        },
        related_payment=payment
    )

def notify_provider_payment_received(payment):
    """Notify provider of payment received"""
    NotificationService.send_notification(
        recipient_id=payment.provider.user.id,
        recipient_role='provider',
        notification_type='provider_payment_received',
        title='Payment Received',
        message=f'You have received payment of ₹{payment.provider_payout_amount} for booking #{payment.booking.id}.',
        metadata={
            'payment_id': payment.id,
            'booking_id': payment.booking.id,
            'amount': str(payment.provider_payout_amount)
        },
        related_payment=payment
    )

def notify_provider_payout_processed(payout):
    """Notify provider that their payout has been processed/initiated"""
    NotificationService.send_notification(
        recipient_id=payout.provider.user.id,
        recipient_role='provider',
        notification_type='provider_payout_processed',
        title='Payout Processed',
        message=f'Your payout of ₹{payout.amount} has been processed. It will reflect in your account shortly.',
        metadata={
            'payout_id': payout.id,
            'amount': str(payout.amount),
            'status': payout.status
        }
    )