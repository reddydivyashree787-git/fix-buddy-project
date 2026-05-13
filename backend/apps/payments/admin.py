from django.contrib import admin
from .models import Payment, ProviderBankAccount, Payout, Refund, PaymentTransaction


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'razorpay_order_id', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('razorpay_order_id', 'booking__id')
    readonly_fields = ('razorpay_order_id', 'razorpay_payment_id', 'created_at', 'updated_at')


@admin.register(ProviderBankAccount)
class ProviderBankAccountAdmin(admin.ModelAdmin):
    list_display = ('provider', 'account_type', 'verification_status', 'is_active', 'created_at')
    list_filter = ('account_type', 'verification_status', 'is_active')
    search_fields = ('provider__user__full_name', 'account_number', 'upi_id')
    readonly_fields = ('razorpay_contact_id', 'razorpay_fund_account_id', 'created_at', 'updated_at')


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'provider', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('provider__user__full_name', 'razorpay_fund_account_id')
    readonly_fields = ('razorpay_transfer_id', 'razorpay_payout_id', 'created_at', 'updated_at')


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ('id', 'payment', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('payment__razorpay_order_id', 'reason')
    readonly_fields = ('razorpay_refund_id', 'created_at', 'updated_at')


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'payment', 'transaction_type', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('payment__razorpay_order_id', 'description')
    readonly_fields = ('created_at',)
