import math

from rest_framework import serializers
from .models import Booking, EmergencyBooking, BookingStatusHistory
from apps.accounts.serializers import UserSerializer, ServiceProviderSerializer
from apps.services.serializers import ServiceSubCategorySerializer


class BookingStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = BookingStatusHistory
        fields = ['id', 'status', 'changed_by_name', 'note', 'created_at']


class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    provider_name = serializers.CharField(source='provider.user.full_name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    category_name = serializers.CharField(source='subcategory.category.name', read_only=True)
    customer_latitude = serializers.FloatField(source='latitude', read_only=True)
    customer_longitude = serializers.FloatField(source='longitude', read_only=True)
    distance_km = serializers.SerializerMethodField()
    status_history = BookingStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone', 'provider', 'provider_name',
            'subcategory', 'subcategory_name', 'category_name', 'status',
            'payment_method',
            'booking_date', 'booking_time', 'address', 'city', 'pincode',
            'latitude', 'longitude', 'customer_latitude', 'customer_longitude',
            'description', 'quoted_price', 'final_price',
            'is_emergency', 'notes', 'distance_km', 'status_history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer', 'status', 'created_at', 'updated_at']

    def get_distance_km(self, obj):
        if obj.latitude is None or obj.longitude is None:
            return None
        provider_user = getattr(obj.provider, 'user', None)
        if not provider_user or provider_user.latitude is None or provider_user.longitude is None:
            return None

        lat1 = math.radians(provider_user.latitude)
        lon1 = math.radians(provider_user.longitude)
        lat2 = math.radians(obj.latitude)
        lon2 = math.radians(obj.longitude)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = 6371 * c
        return round(distance, 2)

class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'provider', 'subcategory', 'booking_date', 'booking_time',
                  'address', 'city', 'pincode', 'latitude', 'longitude',
                  'description', 'quoted_price', 'is_emergency', 'payment_method']
        read_only_fields = ['id']

    def validate_quoted_price(self, value):
        if value is None or value == '':
            raise serializers.ValidationError("quoted_price is required.")
        try:
            return float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("quoted_price must be a number.")

class EmergencyBookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    provider_name = serializers.SerializerMethodField()
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = EmergencyBooking
        fields = [
            'id', 'customer', 'customer_name', 'subcategory', 'subcategory_name',
            'provider', 'provider_name', 'status', 'address', 'city', 'pincode',
            'latitude', 'longitude', 'description', 'priority_level',
            'response_time_minutes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer', 'provider', 'status', 'response_time_minutes', 'created_at']

    def get_provider_name(self, obj):
        return obj.provider.user.full_name if obj.provider else None
