from django.urls import path
from . import views

urlpatterns = [
    path('', views.BookingListCreateView.as_view(), name='booking_list_create'),
    path('<int:pk>/', views.BookingDetailView.as_view(), name='booking_detail'),
    path('<int:pk>/status/', views.update_booking_status, name='update_booking_status'),
    path('emergency/', views.create_emergency_booking, name='create_emergency'),
    path('emergency/list/', views.EmergencyBookingListView.as_view(), name='emergency_list'),
    path('analytics/', views.booking_analytics, name='booking_analytics'),
]
