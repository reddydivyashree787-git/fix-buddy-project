import json
import logging
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError

from apps.bookings.models import Booking, BookingStatusHistory
from apps.accounts.models import ServiceProvider, User
from .models import Payment, Payout, Refund, ProviderBankAccount, PaymentTransaction
from .serializers import PaymentSerializer, ProviderBankAccountSerializer, PayoutSerializer, RefundSerializer
from .razorpay_service import RazorpayService
from apps.notifications.services import notify_provider_payout_processed

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.all()

    def get_queryset(self):
        """Filter payments based on user role"""
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all()
        elif user.role == 'provider':
            return Payment.objects.filter(provider__user=user)
        else:
            return Payment.objects.filter(customer=user)

    @action(detail=False, methods=['post'], url_path='initiate-payment')
    def initiate_payment(self, request):
        """
        Initiate a payment for a booking
        """
        try:
            booking_id = request.data.get('booking_id')
            if not booking_id:
                return Response(
                    {'error': 'booking_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            booking = Booking.objects.get(id=booking_id)

            # Verify booking belongs to requesting customer
            if booking.customer != request.user:
                return Response(
                    {'error': 'Unauthorized'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if payment already exists
            if hasattr(booking, 'payment'):
                return Response(
                    {'error': 'Payment already initiated for this booking'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Calculate amounts
            amount = Decimal(booking.final_price or booking.quoted_price)
            commission_percent = Decimal(settings.COMMISSION_PERCENT) / 100
            commission_amount = amount * commission_percent
            provider_payout_amount = amount - commission_amount

            # Create Razorpay Order
            razorpay_service = RazorpayService()
            order = razorpay_service.create_order(
                amount_in_inr=amount,
                receipt_id=f"booking_{booking.id}",
                notes={
                    'booking_id': booking.id,
                    'customer_id': booking.customer.id,
                    'provider_id': booking.provider.id,
                }
            )

            # Create payment record
            payment = Payment.objects.create(
                booking=booking,
                razorpay_order_id=order['id'],
                amount=amount,
                commission_amount=commission_amount,
                provider_payout_amount=provider_payout_amount,
                customer=booking.customer,
                provider=booking.provider,
                status='pending',
                payment_method='razorpay'
            )

            # Log transaction
            PaymentTransaction.objects.create(
                payment=payment,
                transaction_type='payment_initiated',
                amount=amount,
                description=f"Payment initiated for booking {booking.id}",
                razorpay_response=order,
                status='pending'
            )

            return Response({
                'success': True,
                'payment_id': payment.id,
                'razorpay_order_id': order['id'],
                'amount': float(amount),
                'currency': 'INR',
                'key_id': getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_YOUR_KEY_ID'),
                'customer_name': booking.customer.full_name,
                'customer_email': booking.customer.email,
                'customer_phone': booking.customer.phone,
            }, status=status.HTTP_201_CREATED)

        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error initiating payment: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='verify-payment')
    def verify_payment(self, request):
        """
        Verify payment after successful checkout
        """
        try:
            razorpay_order_id = request.data.get('razorpay_order_id')
            razorpay_payment_id = request.data.get('razorpay_payment_id')
            razorpay_signature = request.data.get('razorpay_signature')

            if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
                return Response(
                    {'error': 'Missing required payment verification parameters'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get payment record
            try:
                payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
            except Payment.DoesNotExist:
                return Response(
                    {'error': 'Payment not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify signature
            razorpay_service = RazorpayService()
            is_valid = razorpay_service.verify_payment_signature(
                order_id=razorpay_order_id,
                payment_id=razorpay_payment_id,
                signature=razorpay_signature
            )

            if not is_valid:
                PaymentTransaction.objects.create(
                    payment=payment,
                    transaction_type='payment_failed',
                    description=f"Signature verification failed for {razorpay_order_id}",
                    status='failed'
                )
                return Response(
                    {'error': 'Invalid payment signature'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update payment record
            with transaction.atomic():
                payment.razorpay_payment_id = razorpay_payment_id
                payment.razorpay_signature = razorpay_signature
                payment.status = 'captured'
                if not payment.payment_method:
                    payment.payment_method = 'razorpay'
                payment.save()

                # Update booking status
                booking = payment.booking
                if booking.status == 'awaiting_payment':
                    booking.status = 'pending'  # Payment done, now waiting for provider acceptance
                    booking.save()

                    BookingStatusHistory.objects.create(
                        booking=booking, status='pending', changed_by=booking.customer
                    )
                    
                    from apps.bookings.views import create_notification
                    create_notification(
                        user=booking.provider.user,
                        notification_type='booking_created',
                        title='New Booking Received',
                        message=f'You have a new paid booking from {booking.customer.full_name} for {booking.subcategory.name}.',
                        booking=booking
                    )

                # Log transaction
                PaymentTransaction.objects.create(
                    payment=payment,
                    transaction_type='payment_captured',
                    amount=payment.amount,
                    description=f"Payment captured for booking {booking.id}",
                    razorpay_response={
                        'razorpay_order_id': razorpay_order_id,
                        'razorpay_payment_id': razorpay_payment_id,
                        'razorpay_signature': razorpay_signature
                    },
                    status='captured'
                )

            return Response({
                'success': True,
                'payment_id': payment.id,
                'message': 'Payment verified successfully',
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error verifying payment: {str(e)}")
            try:
                razorpay_order_id = request.data.get('razorpay_order_id')
                payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
                PaymentTransaction.objects.create(
                    payment=payment,
                    transaction_type='payment_failed',
                    description=f"Exception during verify_payment: {str(e)}",
                    status='error'
                )
            except Exception:
                pass
                
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='initiate-commission')
    def initiate_commission(self, request):
        try:
            booking_id = request.data.get('booking_id')
            if not booking_id:
                return Response({'error': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            booking = Booking.objects.get(id=booking_id)

            if booking.provider.user != request.user:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

            if booking.payment_method != 'offline':
                return Response({'error': 'Not an offline booking'}, status=status.HTTP_400_BAD_REQUEST)

            if hasattr(booking, 'payment') and booking.payment.status == 'captured':
                return Response({'error': 'Commission already paid'}, status=status.HTTP_400_BAD_REQUEST)

            amount = Decimal(booking.quoted_price)
            commission_percent = Decimal(settings.COMMISSION_PERCENT) / 100
            commission_amount = amount * commission_percent

            razorpay_service = RazorpayService()
            order = razorpay_service.create_order(
                amount_in_inr=commission_amount,
                receipt_id=f"comm_{booking.id}",
                notes={
                    'booking_id': booking.id,
                    'type': 'commission'
                }
            )

            # Re-use or create payment record
            if hasattr(booking, 'payment'):
                payment = booking.payment
                payment.razorpay_order_id = order['id']
                payment.amount = commission_amount
                payment.commission_amount = commission_amount
                payment.provider_payout_amount = 0
                payment.status = 'pending'
                payment.save()
            else:
                payment = Payment.objects.create(
                    booking=booking,
                    razorpay_order_id=order['id'],
                    amount=commission_amount,
                    commission_amount=commission_amount,
                    provider_payout_amount=0,
                    customer=booking.customer,
                    provider=booking.provider,
                    status='pending',
                    payment_method='razorpay'
                )

            PaymentTransaction.objects.create(
                payment=payment,
                transaction_type='payment_initiated',
                amount=commission_amount,
                description=f"Commission payment initiated for booking {booking.id}",
                razorpay_response=order,
                status='pending'
            )

            return Response({
                'success': True,
                'payment_id': payment.id,
                'razorpay_order_id': order['id'],
                'amount': float(commission_amount),
                'currency': 'INR',
                'key_id': getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_YOUR_KEY_ID'),
            }, status=status.HTTP_201_CREATED)

        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error initiating commission payment: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='verify-commission')
    def verify_commission(self, request):
        try:
            razorpay_order_id = request.data.get('razorpay_order_id')
            razorpay_payment_id = request.data.get('razorpay_payment_id')
            razorpay_signature = request.data.get('razorpay_signature')

            if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
                return Response({'error': 'Missing required payment verification parameters'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
            except Payment.DoesNotExist:
                return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

            razorpay_service = RazorpayService()
            is_valid = razorpay_service.verify_payment_signature(
                order_id=razorpay_order_id,
                payment_id=razorpay_payment_id,
                signature=razorpay_signature
            )

            if not is_valid:
                PaymentTransaction.objects.create(
                    payment=payment,
                    transaction_type='payment_failed',
                    description=f"Signature verification failed for commission {razorpay_order_id}",
                    status='failed'
                )
                return Response({'error': 'Invalid payment signature'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                payment.razorpay_payment_id = razorpay_payment_id
                payment.razorpay_signature = razorpay_signature
                payment.status = 'captured'
                payment.save()

                booking = payment.booking
                booking.status = 'completed'
                booking.final_price = booking.quoted_price
                booking.save()

                provider = booking.provider
                provider.total_bookings_completed += 1
                provider.save()

                BookingStatusHistory.objects.create(
                    booking=booking, status='completed', changed_by=booking.provider.user, note="Commission paid via Razorpay"
                )

                from apps.bookings.views import create_notification
                create_notification(
                    user=booking.customer,
                    notification_type='booking_status_changed',
                    title='Booking Completed',
                    message=f'Your booking for {booking.subcategory.name} has been completed.',
                    booking=booking
                )

                PaymentTransaction.objects.create(
                    payment=payment,
                    transaction_type='payment_captured',
                    amount=payment.amount,
                    description=f"Commission captured for booking {booking.id}",
                    razorpay_response={
                        'razorpay_order_id': razorpay_order_id,
                        'razorpay_payment_id': razorpay_payment_id,
                        'razorpay_signature': razorpay_signature
                    },
                    status='captured'
                )

            return Response({
                'success': True,
                'message': 'Commission verified and booking completed successfully',
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error verifying commission payment: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='refund')
    def refund_payment(self, request):
        """
        Refund a payment (admin only)
        """
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can refund payments'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            payment_id = request.data.get('payment_id')
            reason = request.data.get('reason', 'Service cancelled')

            if not payment_id:
                return Response(
                    {'error': 'payment_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            payment = Payment.objects.get(id=payment_id)

            if hasattr(payment, 'refund'):
                return Response(
                    {'error': 'Refund already processed for this payment'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            booking = payment.booking
            is_completed = booking.status == 'completed'

            if is_completed:
                partial_refund_percent = Decimal(settings.PARTIAL_REFUND_PERCENT) / 100
                refund_amount = payment.amount * partial_refund_percent
            else:
                refund_amount = payment.amount

            razorpay_service = RazorpayService()
            refund_response = razorpay_service.process_refund(
                payment.razorpay_payment_id,
                refund_amount,
                notes={'reason': reason}
            )

            with transaction.atomic():
                refund = Refund.objects.create(
                    payment=payment,
                    booking=booking,
                    amount=refund_amount,
                    reason=reason,
                    razorpay_refund_id=refund_response['id'],
                    status='initiated',
                    initiated_at=timezone.now(),
                    created_by=request.user
                )

                booking.status = 'cancelled'
                booking.save()

                PaymentTransaction.objects.create(
                    payment=payment,
                    transaction_type='refund_initiated',
                    amount=refund_amount,
                    description=f"Refund initiated: {reason}",
                    razorpay_response=refund_response,
                    status='initiated'
                )

            return Response({
                'success': True,
                'refund_id': refund.id,
                'razorpay_refund_id': refund_response['id'],
                'amount': float(refund_amount),
                'message': 'Refund initiated successfully',
            }, status=status.HTTP_201_CREATED)

        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error refunding payment: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProviderBankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderBankAccountSerializer
    permission_classes = [IsAuthenticated]
    queryset = ProviderBankAccount.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ProviderBankAccount.objects.all()
        elif user.role == 'provider':
            return ProviderBankAccount.objects.filter(provider__user=user)
        return ProviderBankAccount.objects.none()

    def create(self, request, *args, **kwargs):
        """Create or update provider bank account and link to RazorpayX"""
        try:
            if request.user.role != 'provider':
                return Response(
                    {'error': 'Only providers can add bank accounts'},
                    status=status.HTTP_403_FORBIDDEN
                )

            provider = ServiceProvider.objects.get(user=request.user)
            request.data['provider'] = provider.id

            if ProviderBankAccount.objects.filter(provider=provider).exists():
                account = ProviderBankAccount.objects.get(provider=provider)
                serializer = self.get_serializer(account, data=request.data, partial=False)
            else:
                serializer = self.get_serializer(data=request.data)

            serializer.is_valid(raise_exception=True)

            with transaction.atomic():
                if ProviderBankAccount.objects.filter(provider=provider).exists():
                    account = serializer.save()
                else:
                    account = serializer.save(provider=provider)

                try:
                    razorpay_service = RazorpayService()

                    # Create contact if not exists
                    if not account.razorpay_contact_id:
                        contact = razorpay_service.create_contact(
                            name=provider.user.full_name,
                            email=provider.user.email,
                            phone=provider.user.phone
                        )
                        account.razorpay_contact_id = contact['id']

                    # Create fund account
                    fund_account = razorpay_service.create_fund_account(
                        contact_id=account.razorpay_contact_id,
                        account_details={
                            'account_type': 'bank_account',
                            'bank_account': {
                                'name': account.account_holder_name,
                                'ifsc': account.ifsc_code,
                                'account_number': account.account_number
                            }
                        }
                    )
                    account.razorpay_fund_account_id = fund_account['id']
                    
                    # Assume verified for mock
                    account.verification_status = 'verified'
                    account.is_active = True
                    account.save()

                except Exception as e:
                    logger.error(f"Error creating Razorpay fund account: {str(e)}")
                    account.verification_status = 'failed'
                    account.save()
                    return Response(
                        {'error': f'Unable to verify account: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            return Response(
                self.get_serializer(account).data,
                status=status.HTTP_201_CREATED
            )

        except ServiceProvider.DoesNotExist:
            return Response(
                {'error': 'Provider profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error creating bank account: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='my-account')
    def my_account(self, request):
        if request.user.role != 'provider':
            return Response(
                {'error': 'Only providers can view their bank account'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            provider = ServiceProvider.objects.get(user=request.user)
            account = ProviderBankAccount.objects.get(provider=provider)
            serializer = self.get_serializer(account)
            return Response(serializer.data)
        except (ServiceProvider.DoesNotExist, ProviderBankAccount.DoesNotExist):
            return Response(
                {'account': None},
                status=status.HTTP_200_OK
            )


class PayoutViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayoutSerializer
    permission_classes = [IsAuthenticated]
    queryset = Payout.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payout.objects.all()
        elif user.role == 'provider':
            return Payout.objects.filter(provider__user=user)
        return Payout.objects.none()

    @action(detail=False, methods=['get'], url_path='earnings')
    def earnings(self, request):
        if request.user.role != 'provider':
            return Response(
                {'error': 'Only providers can view earnings'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            provider = ServiceProvider.objects.get(user=request.user)
            payouts = Payout.objects.filter(provider=provider)

            total_earned = sum(p.amount for p in payouts if p.status == 'completed')
            pending_payout = sum(p.amount for p in payouts if p.status in ['pending', 'initiated', 'processing'])
            withdrawn = sum(p.amount for p in payouts if p.status == 'completed')

            return Response({
                'total_earned': float(total_earned),
                'pending_payout': float(pending_payout),
                'withdrawn': float(withdrawn),
                'payouts_count': payouts.count(),
                'payouts': PayoutSerializer(payouts, many=True).data,
            })
        except ServiceProvider.DoesNotExist:
            return Response(
                {'error': 'Provider not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='initiate')
    def initiate(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can initiate payouts'}, status=status.HTTP_403_FORBIDDEN)
            
        payout = self.get_object()
        
        if payout.status not in ['pending', 'failed']:
            return Response({'error': f'Cannot initiate payout with status {payout.status}'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not payout.bank_account:
            from apps.payments.models import ProviderBankAccount
            bank_account = ProviderBankAccount.objects.filter(provider=payout.provider).first()
            if bank_account:
                payout.bank_account = bank_account
                payout.save()

        if not payout.bank_account or not payout.bank_account.razorpay_fund_account_id:
            return Response({'error': 'Provider does not have a verified bank account with a fund account ID'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from apps.payments.razorpay_service import RazorpayService
            import logging
            rzp_service = RazorpayService()
            
            payout_resp = rzp_service.create_payout(
                fund_account_id=payout.bank_account.razorpay_fund_account_id,
                amount_in_inr=payout.amount,
                purpose='payout',
                reference_id=f"payout_{payout.id}"
            )
            
            payout.razorpay_payout_id = payout_resp.get('id')
            
            if payout.razorpay_payout_id and str(payout.razorpay_payout_id).startswith('pout_mock'):
                payout.status = 'completed'
                payout.completed_at = timezone.now()
            else:
                payout.status = 'processing'
                
            payout.initiated_at = timezone.now()
            payout.save()
            
            # Notify provider
            try:
                notify_provider_payout_processed(payout)
            except Exception as e:
                logging.getLogger(__name__).error(f"Failed to send payout notification: {str(e)}")

            PaymentTransaction.objects.create(
                payment=payout.payment,
                transaction_type='payout_initiated',
                amount=payout.amount,
                description=f"Payout initiated for provider {payout.provider.user.full_name}",
                razorpay_response=payout_resp,
                status='processing'
            )
            
            return Response(PayoutSerializer(payout).data)
            
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to initiate payout {payout.id}: {str(e)}")
            payout.status = 'failed'
            payout.failed_reason = str(e)
            payout.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    """
    Razorpay webhook handler
    """
    try:
        webhook_body = request.body.decode('utf-8')
        signature = request.META.get('HTTP_X_RAZORPAY_SIGNATURE')

        if not signature:
            logger.warning("Webhook received without signature")
            if not getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', None):
                event = json.loads(webhook_body)
            else:
                return Response({'error': 'Missing signature'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            razorpay_service = RazorpayService()
            is_valid = razorpay_service.verify_webhook_signature(webhook_body, signature)
            if not is_valid:
                logger.warning("Invalid webhook signature")
                return Response({'error': 'Invalid signature'}, status=status.HTTP_403_FORBIDDEN)
            event = json.loads(webhook_body)

        event_type = event.get('event')
        event_data = event.get('payload', {})

        logger.info(f"Processing Razorpay webhook event: {event_type}")

        with transaction.atomic():
            if event_type == 'payment.captured':
                _handle_payment_captured(event_data.get('payment', {}).get('entity', {}))
            elif event_type == 'payment.failed':
                _handle_payment_failed(event_data.get('payment', {}).get('entity', {}))
            elif event_type == 'refund.processed':
                _handle_refund_processed(event_data.get('refund', {}).get('entity', {}))
            elif event_type == 'payout.processed':
                _handle_transfer_processed(event_data.get('payout', {}).get('entity', {}))

        return Response({'status': 'success'})

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


def _handle_payment_captured(data):
    order_id = data.get('order_id')
    try:
        payment = Payment.objects.get(razorpay_order_id=order_id)
        if payment.status != 'captured':
            payment.status = 'captured'
            payment.save()
            payment.booking.status = 'accepted'
            payment.booking.save()
            logger.info(f"Payment captured and booking accepted via webhook: {order_id}")
    except Payment.DoesNotExist:
        logger.warning(f"Payment not found for webhook: {order_id}")


def _handle_payment_failed(data):
    order_id = data.get('order_id')
    try:
        payment = Payment.objects.get(razorpay_order_id=order_id)
        payment.status = 'failed'
        payment.save()
        payment.booking.status = 'pending'
        payment.booking.save()
        logger.info(f"Payment failed via webhook: {order_id}")
    except Payment.DoesNotExist:
        logger.warning(f"Payment not found for webhook: {order_id}")


def _handle_refund_processed(data):
    refund_id = data.get('id')
    if not refund_id: return
    try:
        refund = Refund.objects.get(razorpay_refund_id=refund_id)
        refund.status = 'completed'
        refund.completed_at = timezone.now()
        refund.save()
        logger.info(f"Refund processed via webhook: {refund_id}")
    except Refund.DoesNotExist:
        logger.warning(f"Refund not found for webhook: {refund_id}")


def _handle_transfer_processed(data):
    payout_id = data.get('id')
    try:
        payout = Payout.objects.get(razorpay_payout_id=payout_id)
        payout.status = 'completed'
        payout.completed_at = timezone.now()
        payout.save()
        logger.info(f"Transfer processed via webhook: {payout_id}")
    except Payout.DoesNotExist:
        logger.warning(f"Payout not found for webhook: {payout_id}")
