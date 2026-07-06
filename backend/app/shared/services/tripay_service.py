import structlog
import time
import hashlib
import hmac

logger = structlog.get_logger(__name__)

class TripayService:
    """
    Simulator for Tripay Payment Gateway API.
    In a real production environment, this would hit https://tripay.co.id/api-sandbox/transaction/create
    """
    
    API_KEY = "mock_tripay_api_key"
    PRIVATE_KEY = "mock_tripay_private_key"
    MERCHANT_CODE = "T0001"
    
    @staticmethod
    def create_transaction(user_id: str, amount: float) -> dict:
        """
        Creates a payment invoice (e.g. QRIS) for the user.
        """
        logger.info("tripay_create_transaction_initiated", user_id=user_id, amount=amount)
        
        # Mock Response from Tripay
        reference = f"DEV-{int(time.time())}"
        checkout_url = f"https://tripay.co.id/checkout/{reference}"
        
        logger.info("tripay_transaction_created", reference=reference, checkout_url=checkout_url)
        return {
            "reference": reference,
            "checkout_url": checkout_url,
            "amount": amount
        }
        
    @staticmethod
    def verify_callback_signature(json_payload: str, tripay_signature: str) -> bool:
        """
        Verifies that the webhook callback actually came from Tripay by hashing the payload
        with our PRIVATE_KEY and comparing it to the signature in the headers.
        """
        signature = hmac.new(
            TripayService.PRIVATE_KEY.encode('utf-8'),
            json_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature == tripay_signature
