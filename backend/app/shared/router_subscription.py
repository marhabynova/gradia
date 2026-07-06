from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
import structlog
from datetime import datetime, timedelta
from backend.app.shared.infrastructure.database import get_db
from backend.app.shared.domain.models import User, UserTier, SubscriptionInvoice
from backend.app.shared.services.tripay_service import TripayService

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/api/v1/subscription",
    tags=["Subscriptions (Tripay)"]
)

@router.post("/checkout")
async def create_subscription_checkout(
    # In a real app, user_id comes from JWT auth middleware.
    user_id: str = "123e4567-e89b-12d3-a456-426614174000",
    db: Session = Depends(get_db)
):
    """
    Creates a Tripay Checkout URL for 1-month Premium Subscription
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    subscription_fee = 50000.0 # Rp 50.000 / month
    
    # Hit Tripay API
    try:
        tripay_response = TripayService.create_transaction(str(user.id), subscription_fee)
    except Exception as e:
        logger.error("tripay_api_error", error=str(e))
        raise HTTPException(status_code=500, detail="Gagal menghubungi Payment Gateway")
        
    # Save Invoice to DB
    invoice = SubscriptionInvoice(
        user_id=user.id,
        tripay_reference=tripay_response["reference"],
        amount=tripay_response["amount"],
        status="UNPAID",
        checkout_url=tripay_response["checkout_url"]
    )
    db.add(invoice)
    db.commit()
    
    return {
        "message": "Checkout berhasil dibuat",
        "checkout_url": invoice.checkout_url,
        "reference": invoice.tripay_reference
    }

@router.post("/webhook/tripay")
async def tripay_webhook(
    request: Request,
    x_callback_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint to receive payment notifications from Tripay.
    """
    payload_raw = await request.body()
    payload_str = payload_raw.decode('utf-8')
    
    # Verify Signature (Security)
    if not TripayService.verify_callback_signature(payload_str, x_callback_signature):
        logger.warning("tripay_webhook_invalid_signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    payload = await request.json()
    reference = payload.get("reference")
    status = payload.get("status")
    
    if not reference or not status:
        raise HTTPException(status_code=400, detail="Invalid payload format")
        
    invoice = db.query(SubscriptionInvoice).filter(SubscriptionInvoice.tripay_reference == reference).first()
    if not invoice:
        logger.warning("tripay_webhook_invoice_not_found", reference=reference)
        return {"success": False, "message": "Invoice not found"}
        
    if status == "PAID":
        invoice.status = "PAID"
        
        # Upgrade User to PREMIUM
        user = db.query(User).filter(User.id == invoice.user_id).first()
        if user:
            user.tier = UserTier.PREMIUM
            # Add 30 days of premium
            if user.premium_until and user.premium_until > datetime.utcnow():
                user.premium_until += timedelta(days=30)
            else:
                user.premium_until = datetime.utcnow() + timedelta(days=30)
                
            logger.info("user_upgraded_to_premium", user_id=str(user.id), reference=reference)
            
    elif status in ["EXPIRED", "FAILED"]:
        invoice.status = status
        
    db.commit()
    return {"success": True}
