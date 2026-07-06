import structlog
import asyncio
import random

logger = structlog.get_logger(__name__)

class ScraperService:
    @staticmethod
    async def search_cheapest_product(keyword: str) -> dict:
        """
        Simulates searching across multiple marketplaces for the given keyword
        and returning the absolute cheapest one.
        No AI involved. Pure string matching and math.
        """
        logger.info("arbitrage_search_started", keyword=keyword)
        
        # Simulate network delay for 3 marketplaces
        await asyncio.sleep(1.5)
        
        # Base price calculation (mock logic)
        base_price = random.randint(25000, 150000)
        
        marketplaces = [
            {
                "platform": "Shopee",
                "price": base_price + random.randint(-5000, 10000),
                "url": f"https://shopee.co.id/search?keyword={keyword.replace(' ', '%20')}",
                "image": "https://cf.shopee.co.id/file/mock-search-result.jpg",
                "description": f"Produk {keyword} original kualitas terbaik. Garansi 1 bulan."
            },
            {
                "platform": "Tokopedia",
                "price": base_price + random.randint(-5000, 15000),
                "url": f"https://www.tokopedia.com/search?q={keyword.replace(' ', '%20')}",
                "image": "https://images.tokopedia.net/img/mock-search.jpg",
                "description": f"Ready stock {keyword}. Pengiriman cepat."
            },
            {
                "platform": "AliExpress",
                "price": base_price + random.randint(-15000, 5000), # Usually cheapest
                "url": f"https://www.aliexpress.com/wholesale?SearchText={keyword.replace(' ', '+')}",
                "image": "https://ae01.alicdn.com/kf/mock-search.jpg",
                "description": f"Wholesale {keyword} direct from factory."
            }
        ]
        
        # Sort by price
        marketplaces.sort(key=lambda x: x["price"])
        
        cheapest = marketplaces[0]
        logger.info("arbitrage_cheapest_found", platform=cheapest["platform"], price=cheapest["price"])
        
        return {
            "name": keyword.title(),
            "source_platform": cheapest["platform"],
            "source_url": cheapest["url"],
            "base_price": float(cheapest["price"]),
            "image_url": cheapest["image"],
            "description": cheapest["description"],
            "competitors": marketplaces[1:] # Send back the higher priced ones for comparison
        }
