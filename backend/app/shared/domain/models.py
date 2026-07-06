import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Enum, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from backend.app.shared.infrastructure.database import Base

class TimestampMixin:
    """
    Standardize timestamps for all enterprise tables to allow easy auditing and data lake syncing.
    """
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"

class UserTier(str, enum.Enum):
    FREE = "FREE"
    PREMIUM = "PREMIUM"

class User(Base, TimestampMixin):
    """
    Shared entity for Authentication across both modules.
    Using UUIDs to prevent user enumeration attacks.
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    
    # Profile Fields
    full_name = Column(String(255), nullable=True)
    institution = Column(String(255), nullable=True)
    
    # Premium Fields
    tier = Column(Enum(UserTier), default=UserTier.FREE, nullable=False)
    premium_until = Column(DateTime, nullable=True)
    
    # Quota / Token Cost Control
    paraphrase_count = Column(Integer, default=0, nullable=False)
    last_reset_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Security & Verification
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_otp = Column(String(6), nullable=True)
    
    def __repr__(self):
        return f"<User(email={self.email}, role={self.role}, tier={self.tier})>"

from sqlalchemy import ForeignKey, Float
class SubscriptionInvoice(Base, TimestampMixin):
    __tablename__ = "subscription_invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tripay_reference = Column(String(100), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="UNPAID", nullable=False) # UNPAID, PAID, EXPIRED
    checkout_url = Column(String(1024), nullable=True)

