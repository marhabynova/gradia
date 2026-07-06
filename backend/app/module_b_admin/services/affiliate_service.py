import structlog
from sqlalchemy.orm import Session
from backend.app.module_b_admin.domain.models import AffiliateLink, CommissionRecord

logger = structlog.get_logger(__name__)

class AffiliateService:
    @staticmethod
    def register_link(db: Session, platform_id: str, url: str, product_id: str = None) -> str:
        new_link = AffiliateLink(
            platform_id=platform_id,
            product_id=product_id,
            url=url
        )
        db.add(new_link)
        db.commit()
        logger.info("affiliate_link_registered", link_id=str(new_link.id))
        return str(new_link.id)

    @staticmethod
    def record_commission(db: Session, link_id: str, amount: float) -> str:
        new_commission = CommissionRecord(
            link_id=link_id,
            amount=amount,
            status="PENDING"
        )
        db.add(new_commission)
        db.commit()
        logger.info("commission_recorded", commission_id=str(new_commission.id), amount=amount)
        return str(new_commission.id)

    @staticmethod
    def get_random_download_link(db: Session) -> str:
        """
        Fetches a random affiliate link configured for DOWNLOAD_ADS category.
        Uses ORDER BY RANDOM() for fairness across ads.
        """
        from sqlalchemy.sql.expression import func
        link = db.query(AffiliateLink).filter(AffiliateLink.category == "DOWNLOAD_ADS").order_by(func.random()).first()
        if link:
            return link.url
        # Fallback if no ads are configured
        return "https://gradia.app/support-us"
