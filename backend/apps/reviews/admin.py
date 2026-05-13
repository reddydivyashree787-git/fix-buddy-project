from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['customer', 'provider', 'rating', 'sentiment', 'is_visible', 'created_at']
    list_filter = ['rating', 'sentiment', 'is_visible']
    search_fields = ['customer__email', 'provider__user__email', 'comment']
