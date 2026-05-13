from django.urls import path
from . import views

urlpatterns = [
    path('', views.ReviewListCreateView.as_view(), name='review_list_create'),
    path('provider/<int:provider_id>/', views.provider_reviews, name='provider_reviews'),
    path('analytics/', views.review_analytics, name='review_analytics'),
]
