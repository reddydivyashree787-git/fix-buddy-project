from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Notification(models.Model):
    """
    Comprehensive notification system for multi-role platform
    """

    # Notification Types
    NOTIFICATION_TYPES = [
        # Admin Notifications
        ('admin_user_registration', 'New User Registration'),
        ('admin_provider_registration', 'New Provider Registration'),
        ('admin_provider_verification', 'Provider Verification Request'),
        ('admin_user_complaint', 'User Complaint Filed'),
        ('admin_payment_failed', 'Payment Failure Alert'),
        ('admin_system_alert', 'System Alert'),
        ('admin_support_ticket', 'New Support Ticket'),
        ('admin_content_flagged', 'Content Flagged for Review'),
        ('admin_bulk_operation', 'Bulk Operation Completed'),

        # User Notifications
        ('user_registration_success', 'Registration Successful'),
        ('user_booking_confirmed', 'Booking Confirmed'),
        ('user_booking_updated', 'Booking Updated'),
        ('user_booking_cancelled', 'Booking Cancelled'),
        ('user_payment_success', 'Payment Successful'),
        ('user_payment_failed', 'Payment Failed'),
        ('user_provider_response', 'Provider Response'),
        ('user_support_update', 'Support Ticket Update'),
        ('user_promotional', 'Promotional Offer'),
        ('user_reminder', 'Reminder Alert'),
        ('user_account_change', 'Account Change'),

        # Provider Notifications
        ('provider_new_booking', 'New Booking Received'),
        ('provider_booking_cancelled', 'Booking Cancelled'),
        ('provider_new_review', 'New Review Received'),
        ('provider_payment_received', 'Payment Received'),
        ('provider_payout_processed', 'Payout Processed'),
        ('provider_account_approved', 'Account Approved'),
        ('provider_account_rejected', 'Account Rejected'),
        ('provider_profile_flagged', 'Profile Flagged'),
        ('provider_subscription_reminder', 'Subscription Reminder'),
        ('provider_new_message', 'New Message from User'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    recipient_role = models.CharField(max_length=20, choices=User.ROLE_CHOICES)

    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)  # Store additional data like booking_id, etc.

    is_read = models.BooleanField(default=False)
    is_email_sent = models.BooleanField(default=False)  # Track if email was sent
    is_sms_sent = models.BooleanField(default=False)    # Track if SMS was sent

    # Related objects (optional)
    related_booking = models.ForeignKey('bookings.Booking', on_delete=models.SET_NULL, null=True, blank=True)
    related_payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True)
    related_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='related_notifications')

    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # For time-sensitive notifications

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient_role', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.notification_type} - {self.recipient.email} - {self.title}"

    def mark_as_read(self):
        """Mark notification as read"""
        from django.utils import timezone
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])

    @property
    def is_expired(self):
        """Check if notification has expired"""
        if self.expires_at:
            from django.utils import timezone
            return timezone.now() > self.expires_at
        return False


class NotificationPreference(models.Model):
    """
    User preferences for notification delivery methods
    """

    DELIVERY_METHODS = [
        ('in_app', 'In-App Only'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')

    # Global preferences
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=True)

    # Specific notification type preferences
    booking_notifications = models.CharField(max_length=20, choices=DELIVERY_METHODS, default='in_app')
    payment_notifications = models.CharField(max_length=20, choices=DELIVERY_METHODS, default='email')
    promotional_notifications = models.CharField(max_length=20, choices=DELIVERY_METHODS, default='in_app')
    system_notifications = models.CharField(max_length=20, choices=DELIVERY_METHODS, default='email')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - Notification Preferences"