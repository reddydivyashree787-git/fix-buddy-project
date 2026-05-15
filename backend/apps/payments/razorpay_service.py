import razorpay
import hmac
import hashlib
import logging
from decimal import Decimal
from django.conf import settings

logger = logging.getLogger(__name__)

class RazorpayService:
    """
    Service class for handling Razorpay API operations.
    
    Modes:
    - MOCK mode: Uses placeholder keys (rzp_test_YOUR_KEY_ID) - for development/testing
    - LIVE mode: Uses real Razorpay keys - for production
    
    To switch to LIVE mode:
    1. Get real keys from https://dashboard.razorpay.com → Settings → API Keys
    2. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file
    3. Remove or change the placeholder values
    """

    def __init__(self):
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', None)
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', None)
        
        if not key_id or not key_secret or key_id == 'rzp_test_YOUR_KEY_ID':
            logger.error("⚠️  Razorpay keys are missing or invalid in .env. API calls will fail.")
            
        self.client = razorpay.Client(
            auth=(key_id or '', key_secret or '')
        )
        logger.info(f"✓ Razorpay initialized with key: {str(key_id)[:10] if key_id else 'None'}...")

    def create_order(self, amount_in_inr: Decimal, receipt_id: str, notes: dict = None) -> dict:
        """Create a Razorpay order"""
        try:
            amount_in_paise = int(amount_in_inr * 100)
            data = {
                'amount': amount_in_paise,
                'currency': 'INR',
                'receipt': receipt_id,
                'notes': notes or {}
            }
            order = self.client.order.create(data=data)
            logger.info(f"Razorpay order created: {order['id']}")
            return order
        except Exception as e:
            logger.error(f"Error creating Razorpay order: {str(e)}")
            raise

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        """Verify the payment signature from Razorpay"""
        try:
            params_dict = {
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            }
            return self.client.utility.verify_payment_signature(params_dict)
        except razorpay.errors.SignatureVerificationError:
            logger.warning(f"Signature verification failed for order {order_id}")
            return False
        except Exception as e:
            logger.error(f"Error verifying signature: {str(e)}")
            return False

    def process_refund(self, payment_id: str, amount_in_inr: Decimal = None, notes: dict = None) -> dict:
        """Refund a payment"""
        try:
            data = {}
            if amount_in_inr:
                data['amount'] = int(amount_in_inr * 100)
            if notes:
                data['notes'] = notes
            
            # Using payment.refund because self.client.refund requires refund_id usually
            refund = self.client.payment.refund(payment_id, data)
            logger.info(f"Refund created for payment {payment_id}")
            return refund
        except Exception as e:
            logger.error(f"Error refunding payment {payment_id}: {str(e)}")
            raise

    def create_contact(self, name: str, email: str, phone: str = None, type: str = 'vendor') -> dict:
        """Create a contact in Razorpayx for payouts"""
        try:
            import requests
            from requests.auth import HTTPBasicAuth
            data = {
                'name': name,
                'email': email,
                'contact': phone,
                'type': type
            }
            key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
            key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
            response = requests.post(
                'https://api.razorpay.com/v1/contacts',
                auth=HTTPBasicAuth(key_id, key_secret),
                json=data
            )
            if response.status_code >= 400:
                err_msg = response.json().get('error', {}).get('description', response.text)
                raise Exception(err_msg)
            return response.json()
        except Exception as e:
            logger.error(f"Error creating contact: {str(e)}")
            raise

    def create_fund_account(self, contact_id: str, account_details: dict) -> dict:
        """Create a fund account for a contact"""
        try:
            data = {
                "contact_id": contact_id,
                **account_details
            }
            return self.client.fund_account.create(data=data)
        except Exception as e:
            logger.error(f"Error creating fund account: {str(e)}")
            raise

    def create_payout(self, fund_account_id: str, amount_in_inr: Decimal, purpose: str = 'payout', reference_id: str = None) -> dict:
        """Create a payout to a fund account"""
        try:
            data = {
                "account_number": getattr(settings, 'RAZORPAYX_ACCOUNT_NUMBER', ''),
                "fund_account_id": fund_account_id,
                "amount": int(amount_in_inr * 100),
                "currency": "INR",
                "mode": "NEFT",
                "purpose": purpose,
            }
            if reference_id:
                data["reference_id"] = reference_id
                
            import requests
            from requests.auth import HTTPBasicAuth
            key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
            key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
            response = requests.post(
                'https://api.razorpay.com/v1/payouts',
                auth=HTTPBasicAuth(key_id, key_secret),
                json=data
            )
            if response.status_code >= 400:
                err_msg = response.json().get('error', {}).get('description', response.text)
                # If RazorpayX is not enabled on the test account, mock it for test keys or development
                is_test_key = key_id.startswith('rzp_test_') if key_id else False
                if "The requested URL was not found" in err_msg and (getattr(settings, 'DEBUG', True) or is_test_key):
                    import time
                    return {
                        'id': f'pout_mock_{int(time.time())}',
                        'entity': 'payout',
                        'fund_account_id': fund_account_id,
                        'amount': int(amount_in_inr * 100),
                        'currency': 'INR',
                        'status': 'processing',
                        'mode': 'NEFT',
                        'purpose': purpose,
                        'reference_id': reference_id
                    }
                raise Exception(err_msg)
            return response.json()
        except Exception as e:
            logger.error(f"Error creating payout: {str(e)}")
            raise

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature"""
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', None)
        
        if not webhook_secret:
            logger.error("RAZORPAY_WEBHOOK_SECRET is not configured.")
            return False

        try:
            return self.client.utility.verify_webhook_signature(
                payload, signature, webhook_secret
            )
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            return False
