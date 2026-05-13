from django.contrib import admin
from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient', 'recipient_role', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['recipient_role', 'notification_type', 'is_read', 'created_at']
    search_fields = ['recipient__email', 'title', 'message']
    readonly_fields = ['id', 'created_at', 'read_at']
    ordering = ['-created_at']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recipient')


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_enabled', 'sms_enabled', 'push_enabled']
    list_filter = ['email_enabled', 'sms_enabled', 'push_enabled']
    search_fields = ['user__email']