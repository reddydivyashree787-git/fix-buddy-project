from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""

    recipient_name = serializers.CharField(source='recipient.full_name', read_only=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_role', 'notification_type', 'title', 'message',
            'metadata', 'is_read', 'created_at', 'read_at', 'expires_at',
            'recipient_name', 'recipient_email'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for NotificationPreference model"""

    class Meta:
        model = NotificationPreference
        fields = [
            'user', 'email_enabled', 'sms_enabled', 'push_enabled',
            'booking_notifications', 'payment_notifications',
            'promotional_notifications', 'system_notifications'
        ]
        read_only_fields = ['user']


class SendNotificationSerializer(serializers.Serializer):
    """Serializer for sending notifications"""

    recipient_id = serializers.UUIDField()
    recipient_role = serializers.ChoiceField(choices=['customer', 'provider', 'admin'])
    notification_type = serializers.CharField(max_length=50)
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    metadata = serializers.JSONField(required=False, default=dict)
    expires_at = serializers.DateTimeField(required=False)

    def validate_notification_type(self, value):
        """Validate that notification type exists"""
        valid_types = [choice[0] for choice in Notification.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid notification type: {value}")
        return value