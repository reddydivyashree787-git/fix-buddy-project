from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, ServiceProvider, ProviderAvailability


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'role',
                  'address', 'city', 'state', 'pincode', 'latitude', 'longitude',
                  'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if user.role == 'provider':
            ServiceProvider.objects.create(user=user)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name',
                  'phone', 'role', 'profile_image', 'address', 'city',
                  'state', 'pincode', 'latitude', 'longitude', 'created_at', 'is_active']
        read_only_fields = ['id', 'email', 'role', 'created_at', 'is_active']


class ProviderAvailabilitySerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = ProviderAvailability
        fields = ['id', 'day_of_week', 'day_name', 'start_time', 'end_time', 'is_available']


class ServiceProviderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    availability = ProviderAvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model = ServiceProvider
        fields = ['id', 'user', 'bio', 'experience_years', 'is_verified',
                  'is_available', 'average_rating', 'total_reviews',
                  'total_bookings_completed', 'service_radius_km',
                  'hourly_rate', 'availability', 'created_at']


class ServiceProviderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceProvider
        fields = ['bio', 'experience_years', 'is_available',
                  'service_radius_km', 'hourly_rate']
