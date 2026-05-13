from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'bank-accounts', views.ProviderBankAccountViewSet, basename='bank-account')
router.register(r'payouts', views.PayoutViewSet, basename='payout')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/razorpay/', views.razorpay_webhook, name='razorpay_webhook'),
]
