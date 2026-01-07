"""Service for syncing product data from Matinfo.no API."""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set
from difflib import SequenceMatcher
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.models.matinfo_products import MatinfoProduct, MatinfoAllergen, MatinfoNutrient
from app.services.product_name_cleaner import ProductNameCleaner
from app.infrastructure.database.session import get_db
from app.core.config import settings
from app.utils.gtin import normalize_gtin

logger = logging.getLogger(__name__)


class MatinfoSyncService:
    """Service for syncing product data from Matinfo.no API."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
        self.base_url = settings.MATINFO_API_URL
        self.api_key = settings.MATINFO_API_KEY
        self.name_cleaner = ProductNameCleaner()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def fetch_updated_gtins(
        self,
        since_date: Optional[datetime] = None
    ) -> List[str]:
        """
        Fetch list of GTINs that have been updated since a given date.

        Args:
            since_date: Date to fetch updates from. Defaults to 7 days ago.

        Returns:
            List of GTIN codes that have been updated.
        """
        if since_date is None:
            since_date = datetime.now() - timedelta(days=7)

        # Format date for API (YYYY,MM,DD)
        date_str = since_date.strftime("%Y,%m,%d")
        url = f"{self.base_url}/updatedsince/{date_str}"

        try:
            response = await self.client.get(
                url,
                params={"api_key": self.api_key}
            )
            response.raise_for_status()

            data = response.json()
            products = data.get("products", [])

            # Extract GTINs from the response (handle both string and dict formats)
            gtins = []
            for p in products:
                if isinstance(p, str):
                    raw_gtin = p.strip()
                elif isinstance(p, dict):
                    raw_gtin = p.get("gtin", "")
                else:
                    continue

                # Normalize GTIN to ensure correct format
                gtin = normalize_gtin(raw_gtin)

                # Skip invalid GTINs
                if gtin:
                    gtins.append(gtin)

            logger.info(f"Fetched {len(gtins)} updated GTINs since {since_date}")
            return gtins

        except httpx.HTTPError as e:
            logger.error(f"Error fetching updated GTINs: {e}")
            raise

    async def fetch_product_details(self, gtin: str) -> Optional[Dict]:
        """
        Fetch detailed product information for a specific GTIN.

        Args:
            gtin: The GTIN code to fetch details for.

        Returns:
            Product data dictionary or None if not found.
        """
        url = f"{self.base_url}/product/gtin/{gtin}"

        try:
            response = await self.client.get(
                url,
                params={"api_key": self.api_key},
                headers={"Accept": "application/json; version=5;gpc=1"}
            )

            if response.status_code == 404:
                logger.warning(f"Product not found for GTIN: {gtin}")
                return None

            response.raise_for_status()
            return response.json()

        except httpx.HTTPError as e:
            logger.error(f"Error fetching product details for GTIN {gtin}: {e}")
            return None

    def _calculate_similarity(self, search_term: str, product_name: str) -> float:
        """
        Calculate similarity score between search term and product name.

        Args:
            search_term: The term being searched for.
            product_name: The product name to compare against.

        Returns:
            Similarity score between 0 and 1.
        """
        search_lower = search_term.lower()
        product_lower = product_name.lower()

        # Exact match gets highest score
        if search_lower == product_lower:
            return 1.0

        # Check if search term is at start of product name (high priority)
        if product_lower.startswith(search_lower):
            return 0.95

        # Check if search term is a word in product name
        if f" {search_lower} " in f" {product_lower} ":
            return 0.9

        # Use sequence matcher for fuzzy matching
        return SequenceMatcher(None, search_lower, product_lower).ratio()

    async def search_by_name(self, name: str, limit: int = 10) -> List[Dict]:
        """
        Search for products by name in local matinfo_products table.
        Uses AI to generate name variations and similarity scoring to rank results.

        Args:
            name: Product name to search for.
            limit: Maximum number of results to return.

        Returns:
            List of product dictionaries with similarity scores, ordered by relevance.
        """
        # Generate name variations using AI
        name_variations = await self.name_cleaner.clean_product_name(name)
        logger.info(f"Searching matinfo_products with {len(name_variations)} variations for '{name}'")

        all_matches = []
        seen_gtins = set()

        # Search with each variation
        for variation in name_variations:
            # Search in database - case insensitive LIKE search
            stmt = select(MatinfoProduct).where(
                or_(
                    MatinfoProduct.name.ilike(f"%{variation}%"),
                    MatinfoProduct.brandname.ilike(f"%{variation}%")
                )
            ).limit(limit * 2)  # Get more to filter and rank

            result = await self.db.execute(stmt)
            products = result.scalars().all()

            # Calculate similarity scores
            for product in products:
                if product.gtin in seen_gtins:
                    continue

                seen_gtins.add(product.gtin)

                # Calculate similarity with product name
                name_similarity = self._calculate_similarity(variation, product.name or "")
                brand_similarity = self._calculate_similarity(variation, product.brandname or "") * 0.8

                # Use highest similarity
                similarity = max(name_similarity, brand_similarity)

                all_matches.append({
                    "product": product,
                    "similarity": similarity,
                    "matched_variation": variation
                })

        # Sort by similarity score (highest first)
        all_matches.sort(key=lambda x: x["similarity"], reverse=True)

        # Return top results
        top_matches = all_matches[:limit]

        logger.info(f"Found {len(top_matches)} matches for '{name}'")
        if top_matches:
            logger.info(f"Top match: {top_matches[0]['product'].name} (score: {top_matches[0]['similarity']:.2f})")

        return top_matches

    def _transform_product_data(self, matinfo_data: Dict) -> Dict:
        """
        Transform Matinfo API data to match our database schema.

        Args:
            matinfo_data: Raw data from Matinfo API.

        Returns:
            Transformed data matching our Product model.
        """
        # Normalize GTIN to ensure correct format with leading zeros
        raw_gtin = matinfo_data.get('gtin', '')
        normalized_gtin = normalize_gtin(raw_gtin)

        if not normalized_gtin:
            logger.warning(f"Invalid GTIN from Matinfo API: {raw_gtin}")
            normalized_gtin = raw_gtin  # Keep original if normalization fails

        # Generate a unique ID based on normalized GTIN
        product_id = f"matinfo_{normalized_gtin}"

        # Transform markings and images to text format
        markings = matinfo_data.get("markings", [])
        markings_str = ",".join([m.get("code", "") for m in markings if isinstance(m, dict)])

        images = matinfo_data.get("images", [])
        images_str = ",".join(images) if isinstance(images, list) else ""

        return {
            "id": product_id,
            "gtin": normalized_gtin,
            "name": matinfo_data.get("name"),
            "itemnumber": matinfo_data.get("itemNumber"),
            "epdnumber": matinfo_data.get("epdNumber"),
            "producername": matinfo_data.get("producerName"),
            "providername": matinfo_data.get("providerName"),
            "brandname": matinfo_data.get("brandName"),
            "ingredientstatement": matinfo_data.get("ingredientStatement"),
            "producturl": matinfo_data.get("productUrl"),
            "markings": markings_str,
            "images": images_str,
            "packagesize": matinfo_data.get("packageSize"),
            "updated": datetime.now().isoformat()
        }

    def _transform_allergens(self, product_id: str, matinfo_data: Dict) -> List[Dict]:
        """
        Transform allergen data from Matinfo API.

        Args:
            product_id: The product ID to link allergens to.
            matinfo_data: Raw data from Matinfo API.

        Returns:
            List of allergen dictionaries.
        """
        allergens = []
        for idx, allergen in enumerate(matinfo_data.get("allergens", []), start=1):
            level_map = {
                "FREE_FROM": 0,
                "MAY_CONTAIN": 1,
                "CONTAINS": 2
            }
            # Note: allergenid will be auto-generated by database if it has SERIAL/autoincrement
            # We don't include it in the dict
            allergens.append({
                "productid": product_id,
                "code": allergen.get("code"),
                "name": allergen.get("name"),
                "level": level_map.get(allergen.get("level"), 0)
            })
        return allergens

    def _transform_nutrients(self, product_id: str, matinfo_data: Dict) -> List[Dict]:
        """
        Transform nutrient data from Matinfo API.

        Args:
            product_id: The product ID to link nutrients to.
            matinfo_data: Raw data from Matinfo API.

        Returns:
            List of nutrient dictionaries.
        """
        nutrients = []
        for nutrient in matinfo_data.get("nutrients", []):
            nutrients.append({
                "productid": product_id,
                "code": nutrient.get("code"),
                "name": nutrient.get("name"),
                "measurement": nutrient.get("measurement"),
                "measurementprecision": nutrient.get("measurementPrecision"),
                "measurementtype": nutrient.get("measurementType")
            })
        return nutrients

    async def sync_product(self, gtin: str) -> bool:
        """
        Sync a single product from Matinfo API to our database.

        Args:
            gtin: The GTIN code to sync (will be normalized).

        Returns:
            True if sync was successful, False otherwise.
        """
        # Normalize GTIN before syncing
        normalized_gtin = normalize_gtin(gtin)
        if not normalized_gtin:
            logger.error(f"Invalid GTIN provided for sync: {gtin}")
            return False

        # Fetch product details from API
        matinfo_data = await self.fetch_product_details(normalized_gtin)
        if not matinfo_data:
            return False

        try:
            # Transform data
            product_data = self._transform_product_data(matinfo_data)

            # Check if product exists (using normalized GTIN)
            stmt = select(MatinfoProduct).where(MatinfoProduct.gtin == normalized_gtin)
            result = await self.db.execute(stmt)
            existing_product = result.scalar_one_or_none()

            if existing_product:
                # Keep the existing product id for foreign key consistency
                product_id = existing_product.id

                # Delete existing allergens and nutrients FIRST (before any updates)
                from sqlalchemy import delete
                await self.db.execute(
                    delete(MatinfoAllergen).where(
                        MatinfoAllergen.productid == product_id
                    )
                )
                await self.db.execute(
                    delete(MatinfoNutrient).where(
                        MatinfoNutrient.productid == product_id
                    )
                )

                # Update existing product - but DON'T change the id
                for key, value in product_data.items():
                    if key != "id":  # Skip id to maintain foreign key integrity
                        setattr(existing_product, key, value)
            else:
                # Create new product
                product_id = product_data["id"]
                existing_product = MatinfoProduct(**product_data)
                self.db.add(existing_product)

            # Use the correct product_id for allergens and nutrients
            allergen_data = self._transform_allergens(product_id, matinfo_data)
            nutrient_data = self._transform_nutrients(product_id, matinfo_data)

            # Flush to ensure product is saved
            await self.db.flush()

            # Get next allergenid from sequence
            from sqlalchemy import func
            result = await self.db.execute(
                select(func.coalesce(func.max(MatinfoAllergen.allergenid), 0) + 1)
            )
            next_allergenid = result.scalar()

            # Add allergens with explicit allergenid
            for idx, allergen_dict in enumerate(allergen_data):
                allergen_dict_with_id = {**allergen_dict, "allergenid": next_allergenid + idx}
                allergen = MatinfoAllergen(**allergen_dict_with_id)
                self.db.add(allergen)

            # Get next nutrientid from sequence
            result = await self.db.execute(
                select(func.coalesce(func.max(MatinfoNutrient.nutrientid), 0) + 1)
            )
            next_nutrientid = result.scalar()

            # Add nutrients with explicit nutrientid
            for idx, nutrient_dict in enumerate(nutrient_data):
                nutrient_dict_with_id = {**nutrient_dict, "nutrientid": next_nutrientid + idx}
                nutrient = MatinfoNutrient(**nutrient_dict_with_id)
                self.db.add(nutrient)

            await self.db.commit()
            logger.info(f"Successfully synced product: {normalized_gtin}")
            return True

        except Exception as e:
            logger.error(f"Error syncing product {normalized_gtin}: {e}")
            await self.db.rollback()
            return False

    async def sync_updated_products(
        self,
        since_date: Optional[datetime] = None,
        batch_size: int = 10
    ) -> Dict[str, int]:
        """
        Sync all products updated since a given date.

        Args:
            since_date: Date to fetch updates from.
            batch_size: Number of products to process in parallel.

        Returns:
            Dictionary with sync statistics.
        """
        # Fetch list of updated GTINs
        updated_gtins = await self.fetch_updated_gtins(since_date)

        if not updated_gtins:
            logger.info("No products to sync")
            return {"total": 0, "synced": 0, "failed": 0}

        logger.info(f"Starting sync for {len(updated_gtins)} products")

        synced = 0
        failed = 0

        # Process in batches to avoid overwhelming the API
        for i in range(0, len(updated_gtins), batch_size):
            batch = updated_gtins[i:i + batch_size]

            # Process batch in parallel
            tasks = [self.sync_product(gtin) for gtin in batch]
            results = await asyncio.gather(*tasks)

            # Count results
            synced += sum(1 for r in results if r)
            failed += sum(1 for r in results if not r)

            logger.info(f"Progress: {i + len(batch)}/{len(updated_gtins)}")

            # Small delay between batches to be nice to the API
            if i + batch_size < len(updated_gtins):
                await asyncio.sleep(1)

        logger.info(f"Sync completed: {synced} synced, {failed} failed")

        return {
            "total": len(updated_gtins),
            "synced": synced,
            "failed": failed
        }

    async def get_existing_gtins(self) -> Set[str]:
        """
        Get all GTINs currently in our database.

        Returns:
            Set of GTIN codes.
        """
        stmt = select(MatinfoProduct.gtin).where(
            MatinfoProduct.gtin.isnot(None)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return {r[0] for r in rows}

    async def identify_new_products(
        self,
        since_date: Optional[datetime] = None
    ) -> List[str]:
        """
        Identify products that exist in Matinfo but not in our database.

        Args:
            since_date: Date to fetch updates from.

        Returns:
            List of new GTIN codes.
        """
        # Get updated GTINs from API
        updated_gtins = await self.fetch_updated_gtins(since_date)

        # Get existing GTINs from database
        existing_gtins = await self.get_existing_gtins()

        # Find new GTINs
        new_gtins = [g for g in updated_gtins if g not in existing_gtins]

        logger.info(f"Found {len(new_gtins)} new products to sync")
        return new_gtins


async def run_sync(since_date: Optional[datetime] = None):
    """
    Run a sync of updated products from Matinfo API.

    Args:
        since_date: Date to fetch updates from.
    """
    db = next(get_db())
    try:
        async with MatinfoSyncService(db) as service:
            results = await service.sync_updated_products(since_date)
            print(f"Sync completed: {results}")
    finally:
        db.close()


if __name__ == "__main__":
    # Run sync for products updated in the last 30 days
    asyncio.run(run_sync(datetime.now() - timedelta(days=30)))