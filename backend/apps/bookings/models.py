from django.db import models
from apps.accounts.models import User, ServiceProvider
from apps.services.models import ServiceSubCategory


class Booking(models.Model):
    STATUS_CHOICES = [
        ('awaiting_payment', 'Awaiting Payment'),
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]

    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='bookings')
    subcategory = models.ForeignKey(ServiceSubCategory, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    PAYMENT_METHOD_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline (Cash)'),
    ]
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='online')

    booking_date = models.DateField()
    booking_time = models.TimeField()
    address = models.TextField()
    city = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    description = models.TextField(blank=True)
    quoted_price = models.DecimalField(max_digits=10, decimal_places=2)
    final_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_emergency = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking #{self.id} - {self.customer.full_name} → {self.provider.user.full_name}"


class EmergencyBooking(models.Model):
    STATUS_CHOICES = [
        ('searching', 'Searching Provider'),
        ('assigned', 'Provider Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='emergency_bookings')
    subcategory = models.ForeignKey(ServiceSubCategory, on_delete=models.CASCADE)
    provider = models.ForeignKey(ServiceProvider, on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name='emergency_bookings')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='searching')
    address = models.TextField()
    city = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    description = models.TextField()
    priority_level = models.IntegerField(default=1, choices=[(1, 'High'), (2, 'Critical'), (3, 'Extreme')])
    response_time_minutes = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Emergency #{self.id} - {self.customer.full_name} ({self.status})"


class BookingStatusHistory(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
