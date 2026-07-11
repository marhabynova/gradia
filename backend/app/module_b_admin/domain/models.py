import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Numeric, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("biz_suppliers.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    # Omnichannel Fields
    source_platform = Column(String(100))
    image_url = Column(String(500))
    description = Column(Text)
    sync_status = Column(JSONB, default={"shopee": "pending", "tokopedia": "pending", "tiktok": "pending"})

class ScrapedDraft(Base, TimestampMixin):
    __tablename__ = "biz_scraped_drafts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(500), nullable=False)
    price = Column(Numeric(15, 2), nullable=False)
    original_url = Column(String(1024), nullable=False)
    image_url = Column(String(1024), nullable=True)
    description = Column(Text, nullable=True)
    source_platform = Column(String(100), nullable=False) # e.g. "Tokopedia", "Shopee"
    status = Column(String(50), default="DRAFT", nullable=False) # DRAFT, PUSHED

class Order(Base, TimestampMixin):
    __tablename__ = "biz_orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("biz_products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=True)
    customer_name = Column(String(255), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    status = Column(String(50), default="NEW", nullable=False)
    shipping_address = Column(Text)
    buyer_note = Column(Text, nullable=True)
    supplier_status = Column(String(50), default="NEW", nullable=False)

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
    clicks = Column(Integer, default=0)
    
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
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    admin_email = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    endpoint = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)

class SystemConfig(Base, TimestampMixin):
    __tablename__ = "biz_system_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
