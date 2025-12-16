"""
Hybrid product sync service that tries multiple sources with priority.

Priority:
1. Matinfo (primary) - Full nutrition data, Norwegian products
2. Ngdata (secondary) - Full nutrition data + price + stock (Meny/REITAN only)
3. VetDuAt (fallback) - Basic product info and allergens only
"""
import logging
from typing import Dict, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.matinfo_sync import MatinfoSyncService
from app.services.ngdata_sync import NgdataSyncService
from app.services.vetduat_sync import VetDuAtSyncService
from app.models.matinfo_products import MatinfoProduct
from sqlalchemy import select

logger = logging.getLogger(__name__)


class HybridProductSyncService:
    """Service that combines Matinfo, Ngdata, and VetDuAt searches with priority."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.matinfo_service = MatinfoSyncService(db)
        self.ngdata_service = NgdataSyncService(db)
        self.vetduat_service = VetDuAtSyncService(db)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.matinfo_service.client.aclose()
        await self.ngdata_service.client.aclose()
        await self.vetduat_service.client.aclose()

    async def search_and_sync(
        self,
        gtin: Optional[str] = None,
        name: Optional[str] = None
    ) -> Dict:
        """
        Search and sync product with priority: Matinfo -> Ngdata -> VetDuAt

        Args:
            gtin: Product GTIN code
            name: Product name

        Returns:
            Dict with sync results including source
        """
        if not gtin and not name:
            return {
                "success": False,
                "message": "Either GTIN or name must be provided",
                "source": None
            }

        # Try Matinfo first (priority 1)
        if gtin:
            logger.info(f"Trying Matinfo for GTIN: {gtin}")
            matinfo_success = await self.matinfo_service.sync_product(gtin)

            if matinfo_success:
                return {
                    "success": True,
                    "message": "Product synced from Matinfo (with full nutrition data)",
                    "source": "matinfo",
                    "gtin": gtin,
                    "has_nutrients": True
                }
            logger.info(f"Product not found in Matinfo for GTIN: {gtin}")

        # Try Ngdata as second priority (priority 2)
        logger.info(f"Trying Ngdata for GTIN: {gtin}, Name: {name}")
        ngdata_success = await self.ngdata_service.sync_product(gtin=gtin, name=name)

        if ngdata_success:
            return {
                "success": True,
                "message": "Product synced from Ngdata (full nutrition data + price/stock from Meny)",
                "source": "ngdata",
                "gtin": gtin,
                "has_nutrients": True,
                "info": "Ngdata provides full nutrition data for products sold at Meny/REITAN stores"
            }
        logger.info(f"Product not found in Ngdata for GTIN: {gtin}, Name: {name}")

        # Try VetDuAt as final fallback (priority 3)
        logger.info(f"Trying VetDuAt fallback for GTIN: {gtin}, Name: {name}")
        vetduat_success = await self.vetduat_service.sync_product(gtin=gtin, name=name)

        if vetduat_success:
            return {
                "success": True,
                "message": "Product synced from VetDuAt (allergens only, no nutrition data)",
                "source": "vetduat",
                "gtin": gtin,
                "has_nutrients": False,
                "warning": "VetDuAt does not provide nutrition data. Consider adding manually."
            }

        # All sources failed
        return {
            "success": False,
            "message": f"Product not found in Matinfo, Ngdata, or VetDuAt",
            "source": None,
            "gtin": gtin,
            "name": name
        }

    async def search_by_gtin(self, gtin: str) -> Dict:
        """
        Search for product by GTIN in all sources without syncing.

        Returns combined results with priority indication.
        """
        results = {
            "gtin": gtin,
            "matinfo": None,
            "ngdata": None,
            "vetduat": None,
            "recommendation": None
        }

        # Check if already in database
        stmt = select(MatinfoProduct).where(MatinfoProduct.gtin == gtin)
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            results["in_database"] = True
            results["recommendation"] = "Product already in database"
            return results

        # Try Matinfo (priority 1)
        matinfo_data = await self.matinfo_service.fetch_product_details(gtin)
        if matinfo_data:
            results["matinfo"] = {
                "found": True,
                "name": matinfo_data.get("name"),
                "has_nutrients": len(matinfo_data.get("nutrients", [])) > 0,
                "has_allergens": len(matinfo_data.get("allergens", [])) > 0,
                "brand": matinfo_data.get("brandName")
            }
            results["recommendation"] = "Use Matinfo (has nutrition data)"

        # Try Ngdata (priority 2)
        ngdata_data = await self.ngdata_service.search_by_gtin(gtin)
        if ngdata_data:
            results["ngdata"] = {
                "found": True,
                "name": ngdata_data.get("title"),
                "has_nutrients": len(ngdata_data.get("nutritionalContent", [])) > 0,
                "has_allergens": len(ngdata_data.get("allergens", [])) > 0,
                "brand": ngdata_data.get("brand"),
                "price": ngdata_data.get("pricePerUnit"),
                "in_stock": not ngdata_data.get("isOutOfStock", False)
            }
            if not results["recommendation"]:
                results["recommendation"] = "Use Ngdata (has nutrition data + price/stock from Meny)"

        # Try VetDuAt (priority 3)
        vetduat_data = await self.vetduat_service.search_by_gtin(gtin)
        if vetduat_data:
            results["vetduat"] = {
                "found": True,
                "name": vetduat_data.get("fellesProduktnavn"),
                "has_nutrients": False,
                "has_allergens": True,
                "brand": vetduat_data.get("firmaNavn")
            }
            if not results["recommendation"]:
                results["recommendation"] = "Use VetDuAt (allergens only, no nutrition)"

        return results

    async def search_by_name(self, name: str, limit: int = 10) -> Dict:
        """
        Search by name in Matinfo, Ngdata, and VetDuAt.

        Returns combined results with Matinfo prioritized.
        """
        results = {
            "query": name,
            "matinfo_results": [],
            "ngdata_results": [],
            "vetduat_results": [],
            "total": 0
        }

        # Search Matinfo (priority 1)
        matinfo_matches = await self.matinfo_service.search_by_name(name, limit=limit)
        for match in matinfo_matches:
            product = match["product"]
            results["matinfo_results"].append({
                "gtin": product.gtin,
                "name": product.name,
                "brand": product.brandname,
                "similarity": match["similarity"],
                "source": "matinfo",
                "has_nutrients": True,
                "priority": 1
            })

        seen_gtins = {r["gtin"] for r in results["matinfo_results"]}

        # Search Ngdata (priority 2) - only if Matinfo didn't return enough results
        if len(results["matinfo_results"]) < limit:
            ngdata_result = await self.ngdata_service.search_by_name_multi(name, limit=limit)

            if ngdata_result:
                for product in ngdata_result.get("products", []):
                    gtin = product.get("ean")
                    if gtin and gtin not in seen_gtins:
                        seen_gtins.add(gtin)

                        results["ngdata_results"].append({
                            "gtin": gtin,
                            "name": product.get("title"),
                            "brand": product.get("brand"),
                            "similarity": 0.9,  # Ngdata has good search
                            "source": "ngdata",
                            "has_nutrients": True,
                            "priority": 2,
                            "price": product.get("pricePerUnit"),
                            "in_stock": not product.get("isOutOfStock", False)
                        })

        # Search VetDuAt (priority 3) - only if still not enough results
        if len(results["matinfo_results"]) + len(results["ngdata_results"]) < limit:
            # Use AI-powered name cleaning to generate variations
            name_variations = await self.vetduat_service.name_cleaner.clean_product_name(name)

            for variation in name_variations[:3]:  # Try top 3 variations
                search_response = await self.vetduat_service.client.post(
                    f"{self.vetduat_service.base_url}/search",
                    json={
                        "facets": ["Varemerke,count:10"],
                        "top": limit - len(results["matinfo_results"]) - len(results["ngdata_results"]),
                        "skip": 0,
                        "count": True,
                        "search": variation
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Origin": "https://vetduat.no"
                    }
                )

                if search_response.status_code == 200:
                    data = search_response.json()
                    products = data.get("products", [])
                    facets = data.get("facets", {})

                    for product in products:
                        gtin = product.get("gtin")
                        if gtin and gtin not in seen_gtins:
                            seen_gtins.add(gtin)

                            # Extract brand from facets
                            brand = ""
                            if "Varemerke" in facets:
                                brand_facets = facets["Varemerke"].get("facets", [])
                                if brand_facets:
                                    brand = brand_facets[0].get("value", "")

                            results["vetduat_results"].append({
                                "gtin": gtin,
                                "name": product.get("fellesProduktnavn"),
                                "brand": brand or product.get("firmaNavn"),
                                "similarity": 0.8,  # Estimated
                                "source": "vetduat",
                                "has_nutrients": False,
                                "priority": 3
                            })

        results["total"] = len(results["matinfo_results"]) + len(results["ngdata_results"]) + len(results["vetduat_results"])

        return results

    async def get_product_status(self, gtin: str) -> Dict:
        """
        Get comprehensive status of a product across all sources.
        """
        # Check database
        stmt = select(MatinfoProduct).where(MatinfoProduct.gtin == gtin)
        result = await self.db.execute(stmt)
        db_product = result.scalar_one_or_none()

        status = {
            "gtin": gtin,
            "in_database": db_product is not None,
            "database_info": None,
            "matinfo_available": False,
            "ngdata_available": False,
            "vetduat_available": False,
            "recommendation": None
        }

        if db_product:
            status["database_info"] = {
                "name": db_product.name,
                "has_nutrients": len(db_product.nutrients) > 0,
                "has_allergens": len(db_product.allergens) > 0,
                "nutrient_count": len(db_product.nutrients),
                "allergen_count": len(db_product.allergens)
            }
            status["recommendation"] = "Product already in database"
            return status

        # Check Matinfo availability (priority 1)
        matinfo_data = await self.matinfo_service.fetch_product_details(gtin)
        if matinfo_data:
            status["matinfo_available"] = True
            status["recommendation"] = "Sync from Matinfo for full nutrition data"

        # Check Ngdata availability (priority 2)
        ngdata_data = await self.ngdata_service.search_by_gtin(gtin)
        if ngdata_data:
            status["ngdata_available"] = True
            if not status["recommendation"]:
                status["recommendation"] = "Sync from Ngdata (full nutrition data + price/stock from Meny)"

        # Check VetDuAt availability (priority 3)
        vetduat_data = await self.vetduat_service.search_by_gtin(gtin)
        if vetduat_data:
            status["vetduat_available"] = True
            if not status["recommendation"]:
                status["recommendation"] = "Sync from VetDuAt (allergens only)"

        if not status["matinfo_available"] and not status["ngdata_available"] and not status["vetduat_available"]:
            status["recommendation"] = "Manual entry required - product not found in any source"

        return status
