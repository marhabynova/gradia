import structlog
from sqlalchemy.orm import Session
from backend.app.module_b_admin.domain.models import Product, Order

logger = structlog.get_logger(__name__)

class DropshipService:
    @staticmethod
    def create_product(db: Session, supplier_id: str, name: str, price: float, stock_quantity: int = 0) -> str:
        new_product = Product(
            supplier_id=supplier_id,
            name=name,
            price=price,
            stock_quantity=stock_quantity
        )
        db.add(new_product)
        db.commit()
        logger.info("product_created", product_id=str(new_product.id), supplier_id=supplier_id)
        return str(new_product.id)

    @staticmethod
    def create_order(db: Session, product_id: str, shipping_address: str) -> str:
        new_order = Order(
            product_id=product_id,
            shipping_address=shipping_address,
            status="NEW"
        )
        db.add(new_order)
        db.commit()
        logger.info("order_created", order_id=str(new_order.id), product_id=product_id)
        return str(new_order.id)

    @staticmethod
    def process_order(db: Session, order_id: str, status: str) -> bool:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            order.status = status
            db.commit()
            logger.info("order_status_updated", order_id=order_id, status=status)
            return True
        return False
        
    @staticmethod
    async def process_arbitrage_product(keyword: str, supplier_id: str, db: Session) -> dict:
        from backend.app.module_b_admin.services.scraper_service import ScraperService
        
        # 1. Arbitrage Search (Cheapest Finder)
        arbitrage_data = await ScraperService.search_cheapest_product(keyword)
        
        # 2. No AI used. Pass through raw description.
        # Ensure supplier exists or mock it
        from backend.app.module_b_admin.domain.models import Supplier
        supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not supplier:
            supplier = Supplier(id=supplier_id, name=arbitrage_data["source_platform"])
            db.add(supplier)
            db.commit()
            
        markup_price = arbitrage_data["base_price"] * 1.3 # 30% margin
            
        # 3. Save to database
        product_id = DropshipService.create_product(
            db=db, 
            supplier_id=str(supplier.id), 
            name=arbitrage_data["name"], 
            price=markup_price,
            stock_quantity=100
        )
        
        arbitrage_data["product_id"] = product_id
        arbitrage_data["markup_price"] = markup_price
        return arbitrage_data
