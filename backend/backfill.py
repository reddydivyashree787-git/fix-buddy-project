import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homeservices.settings')
django.setup()

from apps.bookings.models import Booking
from apps.payments.models import Payout

bookings = Booking.objects.filter(
    status='completed', 
    payment__payment_method__in=['razorpay', 'card'], 
    payment__status='captured', 
    payment__payout__isnull=True
)

print(f'Found {bookings.count()} missing payouts.')

for booking in bookings:
    bank_account = getattr(booking.provider, 'bank_account', None)
    Payout.objects.create(
        payment=booking.payment, 
        provider=booking.provider, 
        bank_account=bank_account, 
        amount=booking.payment.provider_payout_amount, 
        status='pending'
    )
    print(f'Created payout for booking {booking.id}')
