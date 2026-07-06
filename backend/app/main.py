import structlog
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
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
# Global Limiter Setup (Memory fallback, Redis if available)
redis_url = os.getenv("REDIS_URL")
if redis_url:
    from limits.storage import RedisStorage
    storage = RedisStorage(redis_url)
    logger.info("rate_limiter_storage", type="redis", url=redis_url)
else:
    from limits.storage import MemoryStorage
    storage = MemoryStorage()
    logger.info("rate_limiter_storage", type="memory")

limiter = Limiter(key_func=get_remote_address, storage_uri=redis_url if redis_url else "memory://")

app = FastAPI(
    title="Gradia API",
    description="Enterprise-Grade Backend for Platform Bantuan Mahasiswa + Admin Dropship",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://gradia.works", "https://www.gradia.works", "http://localhost:5173", "http://localhost"], # Strict CORS for Production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.shared.infrastructure.database import engine, Base

@app.on_event("startup")
async def startup_event():
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
