from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
import structlog
from datetime import datetime, timedelta
from pydantic import BaseModel
from backend.app.shared.infrastructure.database import get_db
from backend.app.shared.domain.models import User, UserTier, SubscriptionInvoice
from backend.app.shared.infrastructure.auth import verify_authenticated_user
from backend.app.shared.infrastructure.limiter import limiter
import random
import os

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/api/v1/subscription",
    tags=["Subscriptions (Tripay)"]
)

class SubscriptionCheckoutRequest(BaseModel):
    amount: float

# Single source of truth for valid subscription prices. The client only picks
# which tier it wants - the price itself is never trusted from the request body,
# since an unvalidated amount would let a user set an arbitrary price (and,
# combined with approve_subscription's amount-based duration logic, buy a longer
# premium period for less than its real price).
VALID_TIERS = {25000: 30, 80000: 180}  # amount -> days granted

@router.post("/checkout")
@limiter.limit("10/minute")
async def create_subscription_checkout(
    request: Request,
    payload: SubscriptionCheckoutRequest,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Creates a manual (WhatsApp-confirmed) Checkout Reference for Premium Subscription
    """
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    subscription_fee = int(payload.amount)
    if subscription_fee not in VALID_TIERS:
        raise HTTPException(status_code=400, detail="Paket langganan tidak valid.")

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


