from django.db import models
from apps.accounts.models import User
from apps.bookings.models import Booking


class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_sessions')
    session_key = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session {self.session_key}"


class ChatMessage(models.Model):
    SENDER_CHOICES = [('user', 'User'), ('bot', 'Bot')]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender}] {self.message[:50]}"


class ChatbotComplaint(models.Model):
    """Handle complaints submitted via chatbot"""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_review', 'In Review'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='chatbot_complaints')
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium')
    chat_session = models.ForeignKey(ChatSession, on_delete=models.SET_NULL, null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Complaint: {self.title} - {self.status}"


class ChatbotBookingDraft(models.Model):
    """Temporary storage for booking details collected via chatbot"""
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, null=True, blank=True, related_name='booking_drafts')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    service_category = models.CharField(max_length=100, blank=True)
    service_subcategory_id = models.IntegerField(null=True, blank=True)
    provider_id = models.IntegerField(null=True, blank=True)
    booking_date = models.DateField(null=True, blank=True)
    booking_time = models.TimeField(null=True, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[('draft', 'Draft'), ('submitted', 'Submitted'), ('cancelled', 'Cancelled')], default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking Draft - {self.service_category} ({self.status})"


