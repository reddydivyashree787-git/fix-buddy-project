from django.contrib import admin
from .models import ServiceCategory, ServiceSubCategory, ProviderService


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(ServiceSubCategory)
class ServiceSubCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'base_price', 'estimated_duration_hours', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'category__name']


@admin.register(ProviderService)
class ProviderServiceAdmin(admin.ModelAdmin):
    list_display = ['provider', 'subcategory', 'custom_price', 'is_active']
    list_filter = ['is_active']
