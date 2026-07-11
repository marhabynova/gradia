import structlog
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logger = structlog.get_logger()

# Sentry Error Tracking Setup
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )
    logger.info("sentry_initialized")
# Global Limiter — diimport dari shared untuk menghindari circular import
from backend.app.shared.infrastructure.limiter import limiter
redis_url = os.getenv("REDIS_URL")

app = FastAPI(
    title="Gradia API",
    description="Enterprise-Grade Backend for Platform Bantuan Mahasiswa + Admin Dropship",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS Middleware
domain_name = os.getenv("DOMAIN_NAME", "gradia.works")
allowed_origins = [f"https://{domain_name}", f"https://www.{domain_name}", "http://localhost:5173", "http://localhost"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, # Strict CORS for Production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.shared.infrastructure.database import engine, Base
from sqlalchemy import text


def ensure_dropship_order_schema():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE IF EXISTS biz_orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1"))
        conn.execute(text("ALTER TABLE IF EXISTS biz_orders ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2)"))
        conn.execute(text("ALTER TABLE IF EXISTS biz_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)"))
        conn.execute(text("ALTER TABLE IF EXISTS biz_orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)"))
        conn.execute(text("ALTER TABLE IF EXISTS biz_orders ADD COLUMN IF NOT EXISTS buyer_note TEXT"))
        conn.execute(text("ALTER TABLE IF EXISTS biz_orders ADD COLUMN IF NOT EXISTS supplier_status VARCHAR(50) DEFAULT 'NEW'"))
        conn.execute(text("UPDATE biz_orders SET quantity = 1 WHERE quantity IS NULL"))

def ensure_user_subscription_schema():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS enhancement_count INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_enhancement_reset_date TIMESTAMP NOT NULL DEFAULT now()"))
        conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS chat_count INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_chat_reset_date TIMESTAMP NOT NULL DEFAULT now()"))

def ensure_audit_log_schema():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE IF EXISTS biz_audit_logs ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255)"))

@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    ensure_dropship_order_schema()
    ensure_user_subscription_schema()
    ensure_audit_log_schema()
    logger.info("gradia_api_starting_up", alembic_managed=True)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Gradia API is running"}

# =======================================================
# PUBLIC SAFELINK AFFILIATE ENDPOINT (MESIN UANG)
# =======================================================
from backend.app.shared.infrastructure.database import get_db
from backend.app.module_b_admin.domain.models import AffiliateLink
from fastapi import Depends
from sqlalchemy.orm import Session
import uuid

@app.get("/link/{link_id}")
def redirect_affiliate(link_id: str, db: Session = Depends(get_db)):
    """
    Safelink Redirect: Catat klik dan lempar ke Shopee/TikTok.
    HTTP 307 memastikan tracking klik valid sebelum pindah.
    """
    try:
        l_uuid = uuid.UUID(link_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Affiliate Link")
        
    link = db.query(AffiliateLink).filter(AffiliateLink.id == l_uuid).first()
    if not link:
        raise HTTPException(status_code=404, detail="Affiliate Link not found")
        
    # Increment tracking clicks
    link.clicks += 1
    db.commit()

    return RedirectResponse(url=link.url, status_code=307)

@app.get("/api/v1/bridge/{link_id}")
def get_bridge_page_data(link_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Public (unauthenticated) content-fetch for the Bridge Page (/baca/:id) -
    the "read the news, then see the offer" safelink landing page. Records a
    page-view Click for analytics, distinct from the click-through redirect above.
    """
    from backend.app.module_b_admin.domain.models import Click

    try:
        l_uuid = uuid.UUID(link_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Link ID")

    link = db.query(AffiliateLink).filter(AffiliateLink.id == l_uuid).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.clicks += 1
    db.add(Click(link_id=link.id, ip_address=request.client.host if request.client else None))
    db.commit()

    return {
        "news_title": link.news_title,
        "news_summary": link.news_summary,
        "news_source_url": link.news_source_url,
        "url": link.url
    }

# =======================================================
# INCLUDE ROUTERS
# =======================================================
from backend.app.shared.router import router as auth_router
from backend.app.shared.router_subscription import router as subscription_router
from backend.app.module_a_student.router import router as student_router
from backend.app.module_b_admin.router import router as admin_router

app.include_router(auth_router)
app.include_router(subscription_router)
app.include_router(student_router)
app.include_router(admin_router)
