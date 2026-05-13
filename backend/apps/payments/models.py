from django.db import models
from apps.accounts.models import User, ServiceProvider
from apps.bookings.models import Booking


class Payment(models.Model):
    """
    Payment model for tracking all payment transactions.
    
    Status flow:
    - pending: Payment initiated, awaiting payment
    - captured: Payment successful
    - failed: Payment failed
    - refunded: Payment was refunded
    """
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('captured', 'Captured'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('card', 'Card'),
        ('upi', 'UPI'),
        ('netbanking', 'Net Banking'),
        ('wallet', 'Wallet'),
    ]

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    
    # Razorpay Order & Payment IDs
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    
    # Payment method used
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    
    # Amounts
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # Total amount in INR
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)  # Platform commission
    provider_payout_amount = models.DecimalField(max_digits=12, decimal_places=2)  # Amount to provider
    
    # Status
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # User references
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='provider_payments')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Error tracking
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment #{self.id} - Order {self.razorpay_order_id}"
    
    @property
    def is_live_payment(self):
        """Check if this is a real payment (not mock)"""
        if not self.razorpay_order_id:
            return False
        return not self.razorpay_order_id.startswith('order_mock_')


class ProviderBankAccount(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('bank', 'Bank Account'),
        ('upi', 'UPI ID'),
    ]

    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('failed', 'Failed'),
    ]

    provider = models.OneToOneField(ServiceProvider, on_delete=models.CASCADE, related_name='bank_account')

    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default='bank')

    # For bank accounts
    account_number = models.CharField(max_length=20, blank=True, null=True)
    ifsc_code = models.CharField(max_length=11, blank=True, null=True)
    account_holder_name = models.CharField(max_length=100, blank=True, null=True)

    # For UPI
    upi_id = models.CharField(max_length=100, blank=True, null=True)

    # Razorpay Connect
    razorpay_contact_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_fund_account_id = models.CharField(max_length=100, blank=True, null=True)
    verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_STATUS_CHOICES, default='pending'
    )
    verification_details = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Provider Bank Accounts'

    def __str__(self):
        return f"{self.provider.user.full_name} - {self.account_type}"


class Payout(models.Model):
    PAYOUT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('initiated', 'Initiated'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('reversed', 'Reversed'),
    ]

    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='payout')
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='payouts')
    bank_account = models.ForeignKey(ProviderBankAccount, on_delete=models.SET_NULL, null=True)

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    razorpay_transfer_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    razorpay_payout_id = models.CharField(max_length=100, blank=True, null=True, unique=True)

    status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default='pending')

    initiated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payout #{self.id} - {self.provider.user.full_name} - {self.amount}"


class Refund(models.Model):
    REFUND_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('initiated', 'Initiated'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='refund')
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='refund')

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()

    razorpay_refund_id = models.CharField(max_length=100, blank=True, null=True, unique=True)

    status = models.CharField(max_length=20, choices=REFUND_STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    initiated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Refund #{self.id} - {self.payment.razorpay_order_id}"


class PaymentTransaction(models.Model):
    """Audit log for all payment transactions"""

    TRANSACTION_TYPE_CHOICES = [
        ('payment_initiated', 'Payment Initiated'),
        ('payment_captured', 'Payment Captured'),
        ('payment_failed', 'Payment Failed'),
        ('payout_initiated', 'Payout Initiated'),
        ('payout_completed', 'Payout Completed'),
        ('payout_failed', 'Payout Failed'),
        ('refund_initiated', 'Refund Initiated'),
        ('refund_completed', 'Refund Completed'),
        ('refund_failed', 'Refund Failed'),
    ]

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    description = models.TextField()
    # Razorpay specific fields
    razorpay_response = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=20)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} - {self.payment.razorpay_order_id}"
