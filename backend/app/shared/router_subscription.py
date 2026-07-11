from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
import structlog
from datetime import datetime, timedelta
from pydantic import BaseModel
from backend.app.shared.infrastructure.database import get_db
from backend.app.shared.domain.models import User, UserTier, SubscriptionInvoice
from backend.app.shared.infrastructure.auth import verify_authenticated_user
import random
import os

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/api/v1/subscription",
    tags=["Subscriptions (Tripay)"]
)

class SubscriptionCheckoutRequest(BaseModel):
    amount: float

@router.post("/checkout")
async def create_subscription_checkout(
    payload: SubscriptionCheckoutRequest,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Creates a Tripay Checkout URL for Premium Subscription
    """
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    subscription_fee = payload.amount
    unique_code = random.randint(1, 999)
    total_amount = subscription_fee + unique_code
    
    reference = f"INV-VIP-{random.randint(1000, 9999)}"
    
    # Save Invoice to DB
    invoice = SubscriptionInvoice(
        user_id=user.id,
        tripay_reference=reference, # Repurpose this field for our manual reference
        amount=total_amount,
        status="PENDING_MANUAL",
        checkout_url="" # Not used
    )
    db.add(invoice)
    db.commit()
    
    admin_wa = os.getenv("ADMIN_WA_NUMBER", "6281234567890")
    wa_text = f"Halo Admin Gradia, saya mau konfirmasi pembayaran akun VIP sebesar Rp{int(total_amount)} dengan kode referensi {reference}."
    wa_url = f"https://wa.me/{admin_wa}?text={wa_text.replace(' ', '%20')}"
    
    return {
        "message": "Checkout manual berhasil dibuat",
        "reference": reference,
        "amount": int(total_amount),
        "whatsapp_url": wa_url
    }


