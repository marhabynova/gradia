import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from backend.app.shared.domain.models import TimestampMixin
from backend.app.shared.infrastructure.database import Base

class Supplier(Base, TimestampMixin):
    __tablename__ = "biz_suppliers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    contact_info = Column(String(255))
    reliability_score = Column(Numeric(5, 2))

class Product(Base, TimestampMixin):
    __tablename__ = "biz_products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("biz_suppliers.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

class Order(Base, TimestampMixin):
    __tablename__ = "biz_orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("biz_products.id"), nullable=False)
    status = Column(String(50), default="NEW", nullable=False)
    shipping_address = Column(Text)

class AffiliatePlatform(Base, TimestampMixin):
    __tablename__ = "biz_affiliate_platforms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False) # e.g. Shopee Affiliate, TikTok Shop

class AffiliateLink(Base, TimestampMixin):
    __tablename__ = "biz_affiliate_links"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform_id = Column(UUID(as_uuid=True), ForeignKey("biz_affiliate_platforms.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("biz_products.id"), nullable=True) # Optional link to internal product
    url = Column(String(1024), nullable=False)
    category = Column(String(50), default="PRODUCT_AFFILIATE", nullable=False) # e.g. DOWNLOAD_ADS, PRODUCT_AFFILIATE, NEWS_SAFELINK
    
    # Bridge Page / Safelink Fields
    news_title = Column(String(255), nullable=True)
    news_summary = Column(Text, nullable=True)
    news_source_url = Column(String(1024), nullable=True)

class Click(Base, TimestampMixin):
    __tablename__ = "biz_clicks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    link_id = Column(UUID(as_uuid=True), ForeignKey("biz_affiliate_links.id"), nullable=False, index=True)
    ip_address = Column(String(45))

class CommissionRecord(Base, TimestampMixin):
    __tablename__ = "biz_commission_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    link_id = Column(UUID(as_uuid=True), ForeignKey("biz_affiliate_links.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default="PENDING")

class ContentJob(Base, TimestampMixin):
    __tablename__ = "biz_content_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("biz_products.id"), nullable=False)
    generated_caption = Column(Text)
    status = Column(String(50), default="PROCESSING")

class AuditLog(Base, TimestampMixin):
    __tablename__ = "biz_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("core_users.id"), nullable=False)
    action = Column(String(255), nullable=False)
    entity_name = Column(String(255), nullable=False) # e.g., Order, Product
    entity_id = Column(String(255), nullable=False)
    changes = Column(Text) # JSON string of changes
