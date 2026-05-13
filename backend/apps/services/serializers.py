from rest_framework import serializers
from .models import ServiceCategory, ServiceSubCategory, ProviderService


class ServiceSubCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = ServiceSubCategory
        fields = ['id', 'category', 'category_name', 'name', 'description',
                  'base_price', 'estimated_duration_hours', 'is_active', 'created_at']


class ServiceCategorySerializer(serializers.ModelSerializer):
    subcategories = ServiceSubCategorySerializer(many=True, read_only=True)
    subcategory_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'description', 'icon', 'image',
                  'is_active', 'subcategories', 'subcategory_count', 'created_at']

    def get_subcategory_count(self, obj):
        return obj.subcategories.filter(is_active=True).count()


class ProviderServiceSerializer(serializers.ModelSerializer):
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    category_name = serializers.CharField(source='subcategory.category.name', read_only=True)
    provider_name = serializers.CharField(source='provider.user.full_name', read_only=True)

    class Meta:
        model = ProviderService
        fields = ['id', 'provider', 'provider_name', 'subcategory', 'subcategory_name',
                  'category_name', 'custom_price', 'description', 'is_active', 'created_at']
        # provider is set automatically from request.user in the view
        read_only_fields = ['id', 'provider', 'created_at']