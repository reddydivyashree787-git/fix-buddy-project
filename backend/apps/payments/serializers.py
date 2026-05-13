from rest_framework import serializers
from .models import Payment, ProviderBankAccount, Payout, Refund


class PaymentSerializer(serializers.ModelSerializer):
    booking_details = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    provider_name = serializers.CharField(source='provider.user.full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'booking_details', 'razorpay_order_id',
            'razorpay_payment_id', 'amount', 'commission_amount',
            'provider_payout_amount', 'status', 'customer_email',
            'provider_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'razorpay_order_id', 'razorpay_payment_id', 'created_at', 'updated_at']

    def get_booking_details(self, obj):
        return {
            'id': obj.booking.id,
            'service': str(obj.booking.subcategory),
            'date': obj.booking.booking_date,
            'time': obj.booking.booking_time,
        }


class ProviderBankAccountSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.user.full_name', read_only=True)

    class Meta:
        model = ProviderBankAccount
        fields = [
            'id', 'provider', 'provider_name', 'account_type', 'account_number',
            'ifsc_code', 'account_holder_name', 'upi_id', 'verification_status',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'verification_status', 'razorpay_contact_id', 'razorpay_fund_account_id', 'created_at']

    def validate(self, data):
        account_type = data.get('account_type')
        if account_type == 'bank':
            if not data.get('account_number') or not data.get('ifsc_code'):
                raise serializers.ValidationError(
                    'Bank account number and IFSC code are required for bank accounts'
                )
        elif account_type == 'upi':
            if not data.get('upi_id'):
                raise serializers.ValidationError('UPI ID is required for UPI accounts')
        return data


class PayoutSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.user.full_name', read_only=True)
    payment_order_id = serializers.CharField(source='payment.razorpay_order_id', read_only=True)

    class Meta:
        model = Payout
        fields = [
            'id', 'payment', 'payment_order_id', 'provider', 'provider_name', 'amount',
            'razorpay_transfer_id', 'razorpay_payout_id', 'status', 'initiated_at',
            'completed_at', 'failed_reason', 'created_at'
        ]
        read_only_fields = ['id', 'razorpay_transfer_id', 'razorpay_payout_id', 'created_at']


class RefundSerializer(serializers.ModelSerializer):
    payment_order_id = serializers.CharField(source='payment.razorpay_order_id', read_only=True)
    customer_email = serializers.CharField(source='booking.customer.email', read_only=True)

    class Meta:
        model = Refund
        fields = [
            'id', 'payment', 'payment_order_id', 'booking', 'amount', 'reason',
            'razorpay_refund_id', 'status', 'customer_email', 'created_by',
            'initiated_at', 'completed_at', 'created_at'
        ]
        read_only_fields = ['id', 'razorpay_refund_id', 'created_at', 'initiated_at', 'completed_at']
