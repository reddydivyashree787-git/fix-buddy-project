from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('provider/profile/', views.ProviderProfileView.as_view(), name='provider_profile'),
    path('provider/availability/', views.set_availability, name='provider_availability'),
    path('providers/', views.ProviderListView.as_view(), name='provider_list'),
    path('providers/all/', views.all_providers, name='all_providers'),
    path('providers/<int:pk>/', views.ProviderDetailView.as_view(), name='provider_detail'),
    path('users/all/', views.all_users, name='all_users'),
    
    # New Auth Features
    path('social-login/', views.social_login, name='social_login'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),
    path('change-password/', views.change_password, name='change_password'),
    path('delete-account/', views.delete_account, name='delete_account'),
    
    path('admin/2fa/setup/', views.setup_2fa, name='setup_2fa'),
    path('admin/2fa/verify-setup/', views.verify_setup_2fa, name='verify_setup_2fa'),
    path('admin/login-activity/', views.login_activity, name='login_activity'),
]
