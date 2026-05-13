from django.contrib import admin
from .models import Booking, EmergencyBooking, BookingStatusHistory


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'provider', 'subcategory', 'status', 'booking_date', 'quoted_price', 'is_emergency']
    list_filter = ['status', 'is_emergency', 'booking_date']
    search_fields = ['customer__email', 'provider__user__email']
    date_hierarchy = 'booking_date'


@admin.register(EmergencyBooking)
class EmergencyBookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'subcategory', 'status', 'priority_level', 'created_at']
    list_filter = ['status', 'priority_level']


admin.site.register(BookingStatusHistory)
