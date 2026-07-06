from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import func
from pydantic import BaseModel
import uuid
import httpx
import json
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from backend.app.shared.infrastructure.database import get_db
from backend.app.module_b_admin.domain.models import Order, AffiliateLink, Product, AffiliatePlatform, AuditLog
from backend.app.shared.domain.models import SubscriptionInvoice, User, UserTier
from backend.app.shared.infrastructure.auth import verify_admin_role
from datetime import datetime, timedelta
from fastapi import WebSocket, WebSocketDisconnect
import asyncio

router = APIRouter(prefix="/admin", tags=["admin_dropship_affiliate"])

def record_audit_log(db: Session, request: Request, payload: dict, action: str, details: dict = None):
    try:
        admin_id = uuid.UUID(payload.get("sub")) if payload.get("sub") else None
    except:
        admin_id = None
        
    audit = AuditLog(
        admin_id=admin_id,
        admin_email=payload.get("email"),
        ip_address=request.client.host if request.client else "Unknown",
        endpoint=str(request.url.path),
        action=action,
        details=json.dumps(details) if details else None
    )
    db.add(audit)
    # We don't commit here, we let the parent endpoint commit it along with the transaction


class AffiliateLinkCreate(BaseModel):
    platform_id: str
    product_id: str = None
    url: str
    category: str = "PRODUCT_AFFILIATE"
    news_title: str = None
    news_summary: str = None
    news_source_url: str = None

class ArbitrageRequest(BaseModel):
    keyword: str

class AutoCheckoutRequest(BaseModel):
    order_id: str
    customer_address: str

class BulkCheckoutRequest(BaseModel):
    order_ids: list[str]

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), payload: dict = Depends(verify_admin_role)):
    """
    Real-time DB aggregations for the Command Center.
    """
    total_orders = db.query(func.count(Order.id)).filter(Order.status == "PENDING").scalar() or 0
    total_clicks = db.query(func.sum(AffiliateLink.clicks)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    
    # Calculate estimated revenue from PENDING and AUTO_CHECKOUT dropship orders
    revenue = db.query(func.sum(Order.price).label('price')).select_from(Order).join(Product).scalar() or 0.0
    
    return {
        "pending_orders": total_orders,
        "affiliate_clicks": total_clicks,
        "total_products": total_products,
        "estimated_revenue": revenue
    }

# ==========================================
# DROPSHIP (ORDERS & ARBITRAGE)
# ==========================================

@router.get("/dropship/orders")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(Order, Product.name, Product.price).outerjoin(
        Product, Order.product_id == Product.id
    ).all()
    
    result = []
    for order, p_name, p_price in orders:
        result.append({
            "id": str(order.id),
            "product_name": p_name or "Unknown Product",
            "customer_address": order.shipping_address,
            "total_price": p_price,
            "status": order.status
        })
    return result

# ==========================================
# REAL-TIME FEED (WEBSOCKETS)
# ==========================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@router.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket feed untuk real-time update dashboard admin (pesanan masuk, dll).
    """
    await manager.connect(websocket)
    try:
        while True:
            # Tetap terbuka dan menunggu pesan jika perlu,
            # biasanya kita menerima ping/pong
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ---------------------------------------------------------
# EXTERNAL API WITH CIRCUIT BREAKER & EXPONENTIAL BACKOFF
# ---------------------------------------------------------
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError))
)
async def fetch_external_marketplace_data(keyword: str):
    """
    Simulates scraping or calling a supplier API.
    Utilizes Tenacity for exponential backoff on failure (Enterprise pattern).
    """
    # For now, we hit a generic dummy JSON endpoint to prove real HTTP flow
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"https://dummyjson.com/products/search?q={keyword}")
        response.raise_for_status()
        return response.json()

@router.post("/dropship/arbitrage")
async def find_arbitrage(request: Request, payload: ArbitrageRequest, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Arbitrage Engine: Calls external API with resilient HTTP client.
    """
    try:
        data = await fetch_external_marketplace_data(payload.keyword)
        products = data.get("products", [])
        
        if not products:
            raise HTTPException(status_code=404, detail="Barang tidak ditemukan di supplier.")
            
        top_product = products[0]
        base_price_usd = top_product.get("price", 10.0)
        base = int(base_price_usd * 15000) # Convert USD to IDR for reality
        
        # Mencatat pengawasan pencarian arbitrage (Omnipresent Audit)
        record_audit_log(db, request, token_payload, "FIND_ARBITRAGE", {"keyword": payload.keyword, "found_product": top_product.get("title")})
        db.commit()
        
        return {
            "data": {
                "name": top_product.get("title"),
                "source_platform": "Global Supplier (via API)",
                "base_price": base,
                "description": top_product.get("description"),
                "image_url": top_product.get("thumbnail"),
                "competitors": [
                    {"platform": "Shopee Lokal", "price": int(base * 1.45)},
                    {"platform": "Tokopedia", "price": int(base * 1.50)}
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supplier API Error (Circuit Broken): {str(e)}")

@router.post("/dropship/orders/auto-checkout")
async def auto_checkout(request: Request, payload: AutoCheckoutRequest, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Simulates sending customer details to Supplier via headless browser API.
    """
    try:
        order_uuid = uuid.UUID(payload.order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Order ID")
        
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status != "PENDING":
        raise HTTPException(status_code=400, detail="Order is already processed")
        
    await asyncio.sleep(2) # Simulate auto-checkout headless scraping delay
    
    order.status = "AUTO_CHECKOUT"
    record_audit_log(db, request, token_payload, "AUTO_CHECKOUT", {"order_id": payload.order_id, "customer_address": payload.customer_address})
    db.commit()
    
    return {"data": {"message": f"Berhasil Checkout otomatis ke Supplier untuk alamat: {payload.customer_address}"}}

@router.post("/dropship/orders/bulk-checkout")
async def bulk_checkout(request: Request, payload: BulkCheckoutRequest, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Memproses banyak pesanan sekaligus (Autopilot Bulk Action).
    Termasuk mencatat ke AuditLog.
    """
    valid_ids = []
    for oid in payload.order_ids:
        try:
            valid_ids.append(uuid.UUID(oid))
        except:
            pass
            
    if not valid_ids:
        raise HTTPException(status_code=400, detail="No valid order IDs provided")
        
    orders = db.query(Order).filter(Order.id.in_(valid_ids), Order.status == "PENDING").all()
    if not orders:
        raise HTTPException(status_code=400, detail="No pending orders found for the given IDs")
        
    processed_count = 0
    for order in orders:
        order.status = "AUTO_CHECKOUT"
        processed_count += 1
        
    # Mencatat Audit Log Komprehensif
    record_audit_log(db, request, token_payload, "BULK_CHECKOUT", {"processed_count": processed_count, "order_ids": [str(o.id) for o in orders]})
    db.commit()
    
    return {"message": f"Berhasil memproses {processed_count} pesanan sekaligus secara Autopilot."}

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Mengambil semua data Audit Trail untuk Dashboard
    """
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{
        "id": str(log.id),
        "admin_email": log.admin_email or "Unknown",
        "ip_address": log.ip_address,
        "endpoint": log.endpoint,
        "action": log.action,
        "details": log.details,
        "created_at": log.created_at.isoformat() if log.created_at else None
    } for log in logs]

# ==========================================
# SUBSCRIPTION VALIDATION (MANUAL)
# ==========================================

@router.get("/subscriptions/pending")
def get_pending_subscriptions(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    invoices = db.query(SubscriptionInvoice, User.email).join(User, SubscriptionInvoice.user_id == User.id).filter(SubscriptionInvoice.status == "PENDING_MANUAL").all()
    return [{
        "id": str(inv.id),
        "user_email": email,
        "amount": inv.amount,
        "reference": inv.tripay_reference,
        "created_at": inv.created_at.isoformat() if inv.created_at else None
    } for inv, email in invoices]

@router.post("/subscriptions/approve/{invoice_id}")
def approve_subscription(request: Request, invoice_id: str, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    try:
        inv_uuid = uuid.UUID(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Invoice ID")
        
    invoice = db.query(SubscriptionInvoice).filter(SubscriptionInvoice.id == inv_uuid).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.status == "PAID":
        raise HTTPException(status_code=400, detail="Invoice already paid")
        
    invoice.status = "PAID"
    
    # Upgrade User
    user = db.query(User).filter(User.id == invoice.user_id).first()
    if user:
        user.tier = UserTier.PREMIUM
        
        # Calculate duration based on amount (25k vs 80k)
        days_to_add = 30 if invoice.amount < 50000 else 180
        
        if user.premium_until and user.premium_until > datetime.utcnow():
            user.premium_until += timedelta(days=days_to_add)
        else:
            user.premium_until = datetime.utcnow() + timedelta(days=days_to_add)
            
    record_audit_log(db, request, token_payload, "APPROVE_VIP", {"reference": invoice.tripay_reference, "user_id": str(user.id)})
    db.commit()
    
    return {"message": "Berhasil memvalidasi pembayaran dan mengaktifkan VIP!"}

# ==========================================
# AFFILIATE LINKS (SAFELINK)
# ==========================================

@router.get("/affiliate/links")
def list_affiliate_links(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    links = db.query(AffiliateLink).all()
    return [{
        "id": str(l.id), 
        "url": l.url, 
        "clicks": l.clicks,
        "category": l.category,
        "news_title": l.news_title
    } for l in links]

@router.post("/affiliate/links")
def add_affiliate_link(request: Request, payload: AffiliateLinkCreate, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    # For MVP, we ignore strict platform validation
    new_link = AffiliateLink(
        platform_id=uuid.UUID(int=1), # Dummy platform UUID
        product_id=uuid.UUID(payload.product_id) if payload.product_id else None,
        url=payload.url,
        category=payload.category,
        news_title=payload.news_title,
        news_summary=payload.news_summary,
        news_source_url=payload.news_source_url
    )
    db.add(new_link)
    record_audit_log(db, request, token_payload, "ADD_AFFILIATE_LINK", {"url": payload.url, "category": payload.category})
    db.commit()
    db.refresh(new_link)
    
    # Pencatatan Jejak Audit Keamanan
    record_audit_log(db, request, token_payload, "CREATE_SAFELINK", {"id": str(new_link.id), "title": new_link.news_title})
    
    return {"message": "Safelink berhasil dibuat", "id": str(new_link.id)}

@router.delete("/affiliate/links/{link_id}")
def delete_affiliate_link(request: Request, link_id: str, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    try:
        l_uuid = uuid.UUID(link_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Link ID")
        
    link = db.query(AffiliateLink).filter(AffiliateLink.id == l_uuid).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
        
    db.delete(link)
    record_audit_log(db, request, token_payload, "DELETE_AFFILIATE_LINK", {"url": link.url})
    db.commit()
    return {"message": "Affiliate Link deleted"}

# ==========================================
# TREND MONITOR (SEMI-MANUAL)
# ==========================================
import xml.etree.ElementTree as ET

@router.get("/trends")
async def get_trends(token_payload: dict = Depends(verify_admin_role)):
    """
    Mengambil RSS dari Google Trends Indonesia (geo=ID)
    Tanpa memanggil AI agar hemat token. Admin yang baca sendiri trennya.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID")
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            trends = []
            
            for item in root.findall('./channel/item'):
                title = item.find('title').text if item.find('title') is not None else ""
                approx_traffic = item.find('{https://trends.google.com/trends/trendingsearches/daily}approx_traffic')
                traffic = approx_traffic.text if approx_traffic is not None else "N/A"
                news_item = item.find('{https://trends.google.com/trends/trendingsearches/daily}news_item')
                
                news_title = ""
                news_url = ""
                if news_item is not None:
                    n_title = news_item.find('{https://trends.google.com/trends/trendingsearches/daily}news_item_title')
                    n_url = news_item.find('{https://trends.google.com/trends/trendingsearches/daily}news_item_url')
                    news_title = n_title.text if n_title is not None else ""
                    news_url = n_url.text if n_url is not None else ""

                trends.append({
                    "keyword": title,
                    "traffic": traffic,
                    "news_title": news_title,
                    "news_url": news_url
                })
                
            return {"data": trends}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil tren: {str(e)}")
