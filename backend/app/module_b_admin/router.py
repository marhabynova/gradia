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

router = APIRouter(prefix="/api/v1/admin", tags=["admin_dropship_affiliate"])

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

class ExtensionScrapePayload(BaseModel):
    name: str
    price: float
    original_url: str
    image_url: str = None
    description: str = None
    source_platform: str

class ArbitrageRequest(BaseModel):
    keyword: str

class AutoCheckoutRequest(BaseModel):
    order_id: str
    customer_address: str

class BulkCheckoutRequest(BaseModel):
    order_ids: list[str]

class CreateDropshipOrderRequest(BaseModel):
    product_id: str
    shipping_address: str
    quantity: int = 1
    customer_name: str | None = None
    customer_phone: str | None = None
    buyer_note: str | None = None

class UpdateOrderStatusRequest(BaseModel):
    status: str

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), payload: dict = Depends(verify_admin_role)):
    """
    Real-time DB aggregations for the Command Center.
    """
    total_orders = db.query(func.count(Order.id)).filter(Order.status.in_(["NEW", "PENDING"])).scalar() or 0
    total_clicks = db.query(func.sum(AffiliateLink.clicks)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    
    # Calculate estimated revenue from active dropship orders using quantity-aware pricing
    revenue = db.query(
        func.coalesce(
            func.sum(func.coalesce(Order.unit_price, Product.price) * func.coalesce(Order.quantity, 1)),
            0
        )
    ).select_from(Order).outerjoin(
        Product, Order.product_id == Product.id
    ).scalar() or 0.0
    
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
def get_orders(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    orders = db.query(Order, Product.name, Product.price).outerjoin(
        Product, Order.product_id == Product.id
    ).all()
    
    result = []
    for order, p_name, p_price in orders:
        quantity = order.quantity or 1
        unit_price = float(order.unit_price) if order.unit_price is not None else float(p_price or 0)
        result.append({
            "id": str(order.id),
            "product_name": p_name or "Unknown Product",
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "customer_address": order.shipping_address,
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": unit_price * quantity,
            "status": order.status,
            "supplier_status": order.supplier_status or order.status,
            "buyer_note": order.buyer_note,
        })
    return result

@router.post("/dropship/orders")
def create_dropship_order(request: Request, payload: CreateDropshipOrderRequest, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    try:
        product_uuid = uuid.UUID(payload.product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Product ID")

    quantity = max(1, int(payload.quantity or 1))
    product = db.query(Product).filter(Product.id == product_uuid).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.stock_quantity < quantity:
        raise HTTPException(status_code=400, detail="Stok master tidak cukup untuk pesanan ini")

    order = Order(
        product_id=product.id,
        quantity=quantity,
        unit_price=product.price,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        shipping_address=payload.shipping_address,
        buyer_note=payload.buyer_note,
        status="PENDING",
        supplier_status="NEW",
    )
    product.stock_quantity -= quantity
    db.add(order)
    record_audit_log(db, request, token_payload, "CREATE_DROPSHIP_ORDER", {"product_id": payload.product_id, "quantity": quantity, "customer_name": payload.customer_name})
    db.commit()
    db.refresh(order)

    return {
        "message": "Pesanan dropship berhasil dibuat",
        "data": {
            "id": str(order.id),
            "product_name": product.name,
            "quantity": quantity,
            "total_price": float(product.price) * quantity,
            "status": order.status,
        },
    }

@router.put("/dropship/orders/{order_id}/status")
def update_dropship_order_status(request: Request, order_id: str, payload: UpdateOrderStatusRequest, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    try:
        order_uuid = uuid.UUID(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Order ID")

    allowed_statuses = {"NEW", "PENDING", "AUTO_CHECKOUT", "PACKING", "SHIPPED", "CANCELLED", "RETURNED"}
    next_status = payload.status.strip().upper()
    if next_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status")

    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = next_status
    if next_status in {"AUTO_CHECKOUT", "PACKING", "SHIPPED"}:
        order.supplier_status = "SENT_TO_SUPPLIER"
    elif next_status == "CANCELLED":
        order.supplier_status = "CANCELLED"
    elif next_status == "RETURNED":
        order.supplier_status = "RETURNED"

    record_audit_log(db, request, token_payload, "UPDATE_ORDER_STATUS", {"order_id": order_id, "status": next_status})
    db.commit()

    return {
        "message": "Status pesanan berhasil diperbarui",
        "data": {
            "id": str(order.id),
            "status": order.status,
            "supplier_status": order.supplier_status,
        },
    }

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
    Simulates scraping real marketplace data using Gemini AI to provide realistic arbitrary competitive data.
    """
    from backend.app.shared.infrastructure.gemini_client import GeminiCostController
    import json
    
    prompt = f"""
    Berikan 1 data produk e-commerce realistis di Indonesia untuk kata kunci pencarian '{keyword}'.
    Format output WAJIB HANYA JSON object murni tanpa blok markdown atau backtick, dengan struktur:
    {{
        "title": "Nama Produk Lengkap (contoh: Sepatu Nike Air Max 2024)",
        "price": <harga_dalam_usd_float_(sekitar 1-100)>,
        "description": "Deskripsi singkat yang menjual",
        "thumbnail": "https://picsum.photos/400?random=1"
    }}
    """
    try:
        response_text = GeminiCostController.generate_content(prompt, requires_advanced_reasoning=False)
        # Bersihkan jika AI masih mengembalikan markdown
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        product = json.loads(response_text)
        return {"products": [product]}
    except Exception as e:
        logger = structlog.get_logger(__name__)
        logger.error("gemini_gen_error", error=str(e))
        return {"products": []}

@router.post("/dropship/arbitrage")
async def find_arbitrage(request: Request, payload: ArbitrageRequest, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Arbitrage Engine: Calls external API with resilient HTTP client (Now AI-powered for realism).
    """
    try:
        data = await fetch_external_marketplace_data(payload.keyword)
        products = data.get("products", [])
        
        if not products:
            # Mengembalikan response kosong dengan 200 OK agar frontend tidak error
            return {"keyword": payload.keyword, "products": []}
            
        top_product = products[0]
        base_price_usd = top_product.get("price", 10.0)
        base = int(base_price_usd * 15000) # Convert USD to IDR for reality
        
        # Mencatat pengawasan pencarian arbitrage (Omnipresent Audit)
        record_audit_log(db, request, token_payload, "FIND_ARBITRAGE", {"keyword": payload.keyword, "found_product": top_product.get("title")})
        db.commit()
        
        return {
            "data": {
                "name": top_product.get("title"),
                "source_platform": "Supplier Import (via AI-Scraping)",
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
    order.supplier_status = "SENT_TO_SUPPLIER"
    record_audit_log(db, request, token_payload, "AUTO_CHECKOUT", {"order_id": payload.order_id, "customer_address": payload.customer_address})
    db.commit()
    
    return {"data": {"message": f"Berhasil Checkout otomatis ke Supplier untuk alamat: {payload.customer_address}"}}

# ==========================================
# CHROME EXTENSION SCRAPER ENDPOINTS
# ==========================================

@router.post("/dropship/extension-scrape")
async def save_extension_scrape(request: Request, payload: ExtensionScrapePayload, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Menerima data dari Chrome Extension yang di-inject di Shopee/Tokopedia.
    Requires the admin token configured in the extension popup.
    """
    from backend.app.module_b_admin.domain.models import ScrapedDraft
    draft = ScrapedDraft(
        name=payload.name,
        price=payload.price,
        original_url=payload.original_url,
        image_url=payload.image_url,
        description=payload.description,
        source_platform=payload.source_platform
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return {"status": "success", "id": str(draft.id)}

@router.post("/dropship/extension-scrape/bulk")
async def save_extension_scrape_bulk(request: Request, payload: list[ExtensionScrapePayload], db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Bulk variant for listing/search-page scraping (many products in one push).
    """
    from backend.app.module_b_admin.domain.models import ScrapedDraft

    if len(payload) > 200:
        raise HTTPException(status_code=400, detail="Terlalu banyak item dalam satu batch (maks 200).")

    drafts = [
        ScrapedDraft(
            name=item.name,
            price=item.price,
            original_url=item.original_url,
            image_url=item.image_url,
            description=item.description,
            source_platform=item.source_platform
        )
        for item in payload
    ]
    db.add_all(drafts)
    db.commit()
    return {"status": "success", "count": len(drafts)}

@router.get("/dropship/extension-scrape")
async def get_extension_scrapes(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    from backend.app.module_b_admin.domain.models import ScrapedDraft
    drafts = db.query(ScrapedDraft).filter(ScrapedDraft.status == "DRAFT").order_by(ScrapedDraft.created_at.desc()).limit(50).all()
    return {
        "status": "success",
        "data": [{
            "id": str(d.id),
            "name": d.name,
            "price": float(d.price),
            "original_url": d.original_url,
            "image_url": d.image_url,
            "source_platform": d.source_platform,
            "created_at": d.created_at.isoformat() if d.created_at else None
        } for d in drafts]
    }
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
        
    orders = db.query(Order).filter(Order.id.in_(valid_ids), Order.status.in_(["NEW", "PENDING"])).all()
    if not orders:
        raise HTTPException(status_code=400, detail="No pending orders found for the given IDs")
        
    processed_count = 0
    for order in orders:
        order.status = "AUTO_CHECKOUT"
        order.supplier_status = "SENT_TO_SUPPLIER"
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

        # Duration is based on the closest valid tier the paid amount matches
        # (checkout adds a 1-999 unique code on top of the base 25000/80000 price).
        days_to_add = 30 if invoice.amount < 50999 else 180
        
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

class GenerateNewsSafelinkRequest(BaseModel):
    news_title: str
    news_source_url: str
    affiliate_url: str

@router.post("/affiliate/links/generate-from-news")
def generate_news_safelink(request: Request, payload: GenerateNewsSafelinkRequest, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Takes a trending news item plus a product/affiliate destination URL, asks
    Gemini to write a short teaser suited for the Bridge Page, and creates the
    resulting NEWS_SAFELINK AffiliateLink ready to share.
    """
    from backend.app.shared.infrastructure.gemini_client import GeminiCostController

    prompt = f"""
    Anda adalah copywriter media sosial. Tulis teaser singkat (2-4 kalimat, Bahasa Indonesia,
    gaya menarik tapi tidak clickbait berlebihan) untuk sebuah halaman "baca selengkapnya"
    berdasarkan judul berita berikut. Teaser ini TIDAK boleh membocorkan seluruh isi berita,
    tujuannya membuat pembaca penasaran untuk klik "baca selengkapnya" sekaligus melihat
    penawaran produk terkait di halaman yang sama.

    Judul Berita: {payload.news_title}

    Balas HANYA dengan teks teaser polos, tanpa tanda kutip, tanpa markdown.
    """
    try:
        news_summary = GeminiCostController.generate_content(prompt, requires_advanced_reasoning=False, max_tokens=300).strip()
    except Exception as e:
        import structlog
        logger = structlog.get_logger(__name__)
        logger.error("generate_news_safelink_ai_failed", error=str(e))
        news_summary = payload.news_title

    new_link = AffiliateLink(
        platform_id=uuid.UUID(int=1), # Dummy platform UUID (matches existing add_affiliate_link convention)
        url=payload.affiliate_url,
        category="NEWS_SAFELINK",
        news_title=payload.news_title,
        news_summary=news_summary,
        news_source_url=payload.news_source_url
    )
    db.add(new_link)
    record_audit_log(db, request, token_payload, "GENERATE_NEWS_SAFELINK", {"news_title": payload.news_title})
    db.commit()
    db.refresh(new_link)

    return {
        "message": "Konten afiliasi berhasil dibuat dari berita",
        "id": str(new_link.id),
        "news_summary": news_summary,
        "bridge_path": f"/baca/{new_link.id}"
    }

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
# TREND MONITOR (SEMI-MANUAL & SEARCHABLE)
# ==========================================
import xml.etree.ElementTree as ET

@router.get("/trends")
async def get_trends(query: str = None, token_payload: dict = Depends(verify_admin_role)):
    """
    Mengambil RSS dari Google News. Jika query ada, gunakan search endpoint.
    Jika tidak, Top Stories.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if query and query.strip() != "":
                # Search mode
                encoded_q = httpx.utils.quote(query.strip())
                url = f"https://news.google.com/rss/search?q={encoded_q}&hl=id&gl=ID&ceid=ID:id"
            else:
                # Top stories mode
                url = "https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id"
                
            response = await client.get(url)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            trends = []
            
            # Ambil 10 berita teratas
            for item in root.findall('./channel/item')[:10]:
                title = item.find('title').text if item.find('title') is not None else ""
                link = item.find('link').text if item.find('link') is not None else ""
                
                # Parsing nama sumber dari judul (biasanya format: "Judul Berita - Nama Sumber")
                keyword = title.split(' - ')[-1] if ' - ' in title else "Trending"
                news_title = title.rsplit(' - ', 1)[0] if ' - ' in title else title
                
                trends.append({
                    "keyword": keyword,
                    "traffic": "Hot 🔥",
                    "news_title": news_title,
                    "news_url": link
                })
                
            return {"data": trends}
    except Exception as e:
        import structlog
        logger = structlog.get_logger(__name__)
        logger.error("trends_fetch_error", error=str(e))
        return {
            "status": "error",
            "message": "Gagal mengambil data tren"
        }

@router.get("/student-config")
async def get_student_config(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Mengambil pengaturan global untuk Modul Mahasiswa (Ads & Affiliate)
    """
    from backend.app.module_b_admin.domain.models import SystemConfig
    configs = db.query(SystemConfig).filter(SystemConfig.key.in_(["student_ads_enabled", "student_safelink_url"])).all()
    
    # Default values
    result = {
        "student_ads_enabled": False,
        "student_safelink_url": "https://safelink.com/default"
    }
    
    for c in configs:
        result[c.key] = c.value
        
    return {"status": "success", "data": result}

@router.post("/student-config")
async def save_student_config(payload: dict, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Menyimpan pengaturan global untuk Modul Mahasiswa
    """
    from backend.app.module_b_admin.domain.models import SystemConfig
    
    for key in ["student_ads_enabled", "student_safelink_url"]:
        if key in payload:
            config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
            if not config:
                config = SystemConfig(key=key, value=payload[key])
                db.add(config)
            else:
                config.value = payload[key]
                
    db.commit()
    return {"status": "success", "message": "Konfigurasi berhasil disimpan"}

# ==========================================
# MOCK ENDPOINTS UNTUK GRADIA OMNICHANNEL ERP
# ==========================================

class MockProductPayload(BaseModel):
    product: dict

def _normalize_product_payload(product: dict) -> dict:
    return {
        "name": product.get("name") or product.get("title") or "Unknown Product",
        "price": product.get("base_price") or product.get("price") or 0,
        "source_platform": product.get("source_platform") or "Manual",
        "image_url": product.get("image_url") or product.get("thumbnail") or "",
        "description": product.get("description") or "",
    }


@router.post("/omnichannel/publish")
async def mass_publish_omnichannel(payload: MockProductPayload, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Publishes a product into the local master data and marks it as published.
    """
    import asyncio
    prod_data = _normalize_product_payload(payload.product)

    existing = None
    prod_id = payload.product.get("id")
    if prod_id:
        try:
            existing = db.query(Product).filter(Product.id == uuid.UUID(prod_id)).first()
        except Exception:
            existing = None

    if existing:
        existing.name = prod_data["name"]
        existing.price = prod_data["price"]
        existing.source_platform = prod_data["source_platform"]
        existing.image_url = prod_data["image_url"]
        existing.description = prod_data["description"]
        existing.sync_status = {"shopee": "published", "tokopedia": "published", "tiktok": "published"}
        target = existing
    else:
        target = Product(
            name=prod_data["name"],
            price=prod_data["price"],
            source_platform=prod_data["source_platform"],
            image_url=prod_data["image_url"],
            description=prod_data["description"],
            stock_quantity=100,
            sync_status={"shopee": "published", "tokopedia": "published", "tiktok": "published"}
        )
        db.add(target)

    db.commit()
    db.refresh(target)

    await asyncio.sleep(1.0)
    return {"message": "Produk berhasil dipublish ke master data lokal", "status": "ok", "data": {"id": str(target.id)}}

@router.post("/omnichannel/sync-inventory")
async def sync_inventory_omnichannel(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Syncs the local master inventory status to published.
    """
    import asyncio
    products = db.query(Product).all()
    for product in products:
        product.sync_status = {"shopee": "ok", "tokopedia": "ok", "tiktok": "ok"}
    db.commit()
    await asyncio.sleep(1.0)
    return {"message": "Inventory synced successfully", "status": "ok", "synced_count": len(products)}

@router.post("/omnichannel/products/master")
async def save_master_product(payload: MockProductPayload, db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Menyimpan produk hasil scrape ke gudang Gradia (Center of Truth).
    """
    prod_data = _normalize_product_payload(payload.product)
    new_prod = Product(
        name=prod_data["name"],
        price=prod_data["price"],
        source_platform=prod_data["source_platform"],
        image_url=prod_data["image_url"],
        description=prod_data["description"],
        stock_quantity=100, # Default stock
        sync_status={"shopee": "pending", "tokopedia": "pending", "tiktok": "pending"}
    )
    # Kami biarkan supplier_id kosong (nullable=True sekarang) karena dari scraper belum terikat supplier
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return {"message": "Produk berhasil disimpan ke Master Data Lokal", "data": {"id": str(new_prod.id)}}

@router.get("/omnichannel/products")
async def get_master_products(db: Session = Depends(get_db), token_payload: dict = Depends(verify_admin_role)):
    """
    Mengambil list produk di gudang Gradia.
    """
    products = db.query(Product).order_by(Product.created_at.desc()).all()
    return {
        "status": "success",
        "data": [
            {
                "id": str(p.id),
                "name": p.name,
                "price": float(p.price) if p.price else 0,
                "stock_quantity": p.stock_quantity,
                "source_platform": p.source_platform,
                "image_url": p.image_url,
                "sync_status": p.sync_status or {"shopee": "pending", "tokopedia": "pending", "tiktok": "pending"},
                "created_at": p.created_at.isoformat() if p.created_at else None
            } for p in products
        ]
    }
