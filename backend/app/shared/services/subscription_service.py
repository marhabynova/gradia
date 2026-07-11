import structlog
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.shared.domain.models import User, UserTier

logger = structlog.get_logger(__name__)

class SubscriptionService:
    """
    Single source of truth for whether a user's premium access is currently valid.
    Lazily downgrades users whose premium_until has passed, since paid tier is
    time-boxed (30 days for the 25rb plan, 180 days for the 80rb plan) but nothing
    was actively expiring `user.tier` back to FREE.
    """

    @staticmethod
    def is_premium_active(user: User, db: Session) -> bool:
        if not user or user.tier != UserTier.PREMIUM:
            return False

        if user.premium_until is None:
            # No expiry recorded (e.g. manually granted) - treat as active.
            return True

        if user.premium_until < datetime.utcnow():
            logger.info("premium_expired_auto_downgrade", user_id=str(user.id), premium_until=user.premium_until)
            user.tier = UserTier.FREE
            db.commit()
            return False

        return True
