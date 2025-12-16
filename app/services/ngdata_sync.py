"""Service for syncing product data from Ngdata API (used by Meny/REITAN stores)."""
import logging
from typing import Dict, Optional, List
import httpx
from datetime import datetime

from app.models.matinfo_products import MatinfoProduct, MatinfoAllergen, MatinfoNutrient
from app.services.product_name_cleaner import ProductNameCleaner
from app.utils.gtin import normalize_gtin
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

logger = logging.getLogger(__name__)


class NgdataSyncService:
    """Service for syncing product data from Ngdata API (Meny/REITAN)."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://platform-rest-prod.ngdata.no/api/episearch"
        self.chain_id = "1300"  # Meny
        self.store_id = "7080001150488"  # Default Meny store
        self.name_cleaner = ProductNameCleaner()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def search_by_gtin(self, gtin: str) -> Optional[Dict]:
        """
        Search for product by GTIN/EAN in Ngdata API.

        Args:
            gtin: The GTIN/EAN code to search for.

        Returns:
            Product data dictionary or None if not found.
        """
        try:
            logger.info(f"Searching Ngdata for GTIN: {gtin}")
            response = await self.client.get(
                f"{self.base_url}/{self.chain_id}/autosuggest",
                params={
                    "types": "products",
                    "search": gtin,
                    "page_size": 1,
                    "store_id": self.store_id,
                    "popularity": "true",
                    "fieldset": "maximal",
                    "showNotForSale": "true",
                    "version": "1"
                }
            )

            if response.status_code == 404:
                logger.warning(f"Product not found for GTIN: {gtin}")
                return None

            response.raise_for_status()
            data = response.json()

            products = data.get("products", {}).get("hits", [])
            if not products:
                logger.warning(f"No products found for GTIN: {gtin}")
                return None

            # Return first match
            product = products[0]
            logger.info(f"Found product in Ngdata: {product.get('title')}")
            return product

        except httpx.HTTPError as e:
            logger.error(f"Error searching Ngdata for GTIN {gtin}: {e}")
            return None

    async def search_by_name(self, name: str, limit: int = 1) -> Optional[Dict]:
        """
        Search for product by name in Ngdata API.
        Returns only the first match (for backward compatibility with sync_product).

        For multiple results, use search_by_name_multi().

        Args:
            name: The product name to search for.
            limit: Maximum number of results to fetch (default 1).

        Returns:
            Product data dictionary or None if not found.
        """
        try:
            logger.info(f"Searching Ngdata for name: {name}")
            response = await self.client.get(
                f"{self.base_url}/{self.chain_id}/autosuggest",
                params={
                    "types": "products",
                    "search": name,
                    "page_size": limit,
                    "store_id": self.store_id,
                    "popularity": "true",
                    "fieldset": "maximal",
                    "showNotForSale": "true",
                    "version": "1"
                }
            )

            if response.status_code == 404:
                logger.warning(f"Product not found for name: {name}")
                return None

            response.raise_for_status()
            data = response.json()

            products = data.get("products", {}).get("hits", [])
            if not products:
                logger.warning(f"No products found for name: {name}")
                return None

            # Return first match
            product = products[0]
            logger.info(f"Found product in Ngdata: {product.get('title')}")
            return product

        except httpx.HTTPError as e:
            logger.error(f"Error searching Ngdata for name {name}: {e}")
            return None

    async def search_by_name_multi(self, name: str, limit: int = 20) -> Optional[Dict]:
        """
        Search for multiple products by name in Ngdata API.
        Returns all matching products with metadata.

        Args:
            name: The product name to search for.
            limit: Maximum number of results to return (default 20).

        Returns:
            Dictionary containing products and count, or None if not found.
        """
        try:
            logger.info(f"Searching Ngdata for name: {name} (limit: {limit})")
            response = await self.client.get(
                f"{self.base_url}/{self.chain_id}/autosuggest",
                params={
                    "types": "products",
                    "search": name,
                    "page_size": limit,
                    "store_id": self.store_id,
                    "popularity": "true",
                    "fieldset": "maximal",
                    "showNotForSale": "true",
                    "version": "1"
                }
            )

            if response.status_code == 404:
                logger.warning(f"Products not found for name: {name}")
                return None

            response.raise_for_status()
            data = response.json()

            products = data.get("products", {}).get("hits", [])
            if not products:
                logger.warning(f"No products found for name: {name}")
                return None

            # Return all matches with metadata
            total_count = data.get("products", {}).get("total", len(products))
            logger.info(f"Found {len(products)} products in Ngdata for '{name}' (total: {total_count})")

            return {
                "products": products,
                "count": total_count
            }

        except httpx.HTTPError as e:
            logger.error(f"Error searching Ngdata for name {name}: {e}")
            return None

    def _extract_allergens_from_ngdata(self, allergens: List[Dict]) -> List[Dict]:
        """
        Extract allergen data from Ngdata format.

        Args:
            allergens: Allergens array from Ngdata response.

        Returns:
            List of allergen dictionaries in Matinfo format.
        """
        allergen_list = []

        # Mapping from Ngdata allergen codes to Matinfo codes
        code_mapping = {
            "GLUTEN": "AW",
            "WHEAT": "UW",
            "RYE": "NR",
            "BARLEY": "GB",
            "OATS": "GO",
            "SPELT": "GS",
            "KHORASAN": "GK",
            "CRUSTACEANS": "AC",
            "EGGS": "AE",
            "FISH": "AF",
            "PEANUTS": "AP",
            "SOYBEANS": "AY",
            "MILK": "AM",
            "ALMONDS": "SA",
            "HAZELNUTS": "SH",
            "WALNUTS": "SW",
            "CASHEWS": "SC",
            "PECAN": "SP",
            "BRAZIL": "SR",
            "PISTACHIO": "ST",
            "MACADAMIA": "SM",
            "CELERY": "BC",
            "MUSTARD": "BM",
            "SESAME": "AS",
            "SULPHUR": "AU",
            "LUPIN": "NL",
            "MOLLUSCS": "UM"
        }

        for allergen_item in allergens:
            allergen_code = allergen_item.get("code", "").upper()
            allergen_name = allergen_item.get("display", "")
            contains = allergen_item.get("contains", "FRI")

            # Map "JA" to level 2 (CONTAINS), "FRI" to level 0 (FREE_FROM)
            # Ngdata doesn't seem to have "may contain"
            if contains == "JA":
                level = 2  # CONTAINS
            else:
                level = 0  # FREE_FROM

            code = code_mapping.get(allergen_code, allergen_code[:2])

            allergen_list.append({
                "code": code,
                "name": allergen_name,
                "level": level
            })

        return allergen_list

    def _extract_nutrients_from_ngdata(self, nutritional_content: List[Dict]) -> List[Dict]:
        """
        Extract nutrient data from Ngdata format.

        Args:
            nutritional_content: Nutritional content array from Ngdata response.

        Returns:
            List of nutrient dictionaries in Matinfo format.
        """
        nutrient_list = []

        # Mapping from Ngdata codes to Matinfo codes
        code_mapping = {
            "ENER-": "ENER-",  # Energy kJ
            "ENERC": "ENERC",  # Energy kcal
            "FAT": "FAT",      # Fat
            "FASAT": "FASAT",  # Saturated fat
            "CHOAVL": "CHOAVL",  # Carbohydrates
            "SUGAR-": "SUGAR-",  # Sugars
            "PRO-": "PRO-",    # Protein
            "SALTEQ": "SALTEQ",  # Salt
            "FIBTG": "FIBTG"   # Fiber
        }

        for nutrient_item in nutritional_content:
            nutrient_code = nutrient_item.get("code", "")
            nutrient_name = nutrient_item.get("display", "")
            amount = nutrient_item.get("amount", 0)
            unit = nutrient_item.get("unit", "")

            code = code_mapping.get(nutrient_code, nutrient_code)

            nutrient_list.append({
                "code": code,
                "name": nutrient_name,
                "quantity": str(amount),
                "unit": unit
            })

        return nutrient_list

    def _transform_to_matinfo_format(self, ngdata_data: Dict) -> Dict:
        """
        Transform Ngdata product data to Matinfo format.

        Args:
            ngdata_data: Product data from Ngdata API.

        Returns:
            Dictionary in Matinfo Product format.
        """
        # Normalize GTIN to ensure correct format with leading zeros
        raw_gtin = ngdata_data.get("ean", "")
        gtin = normalize_gtin(raw_gtin)

        if not gtin:
            logger.warning(f"Invalid GTIN from Ngdata API: {raw_gtin}")
            gtin = raw_gtin  # Keep original if normalization fails

        product_id = f"matinfo_{gtin}"

        # Extract allergens
        allergens = self._extract_allergens_from_ngdata(
            ngdata_data.get("allergens", [])
        )

        # Extract nutrients
        nutrients = self._extract_nutrients_from_ngdata(
            ngdata_data.get("nutritionalContent", [])
        )

        # Build product data
        product_data = {
            "id": product_id,
            "gtin": gtin,
            "name": ngdata_data.get("title", ""),
            "itemnumber": str(ngdata_data.get("contentId", "")),
            "epdnumber": str(ngdata_data.get("epdNumber", "")),
            "producername": ngdata_data.get("brand", ""),
            "providername": ngdata_data.get("brand", ""),
            "brandname": ngdata_data.get("brand", ""),
            "ingredientstatement": ngdata_data.get("ingredients", ""),
            "producturl": "",
            "markings": "",  # Could extract from environmentalData
            "images": "",    # Could extract from images array
            "packagesize": ngdata_data.get("description", ""),
            "updated": datetime.now().isoformat()
        }

        # Return product, allergens, and nutrients
        return {
            "product": product_data,
            "allergens": allergens,
            "nutrients": nutrients
        }

    async def sync_product(self, gtin: str = None, name: str = None) -> bool:
        """
        Sync a product from Ngdata API to our database.
        First tries GTIN search, then falls back to name search with AI-powered cleaning.

        Args:
            gtin: Optional GTIN code to search for (will be normalized).
            name: Optional product name to search for.

        Returns:
            True if sync was successful, False otherwise.
        """
        # Normalize GTIN if provided
        if gtin:
            normalized_gtin = normalize_gtin(gtin)
            if normalized_gtin:
                gtin = normalized_gtin
            else:
                logger.warning(f"Could not normalize GTIN: {gtin}, using original")

        ngdata_product = None

        # Try GTIN search first
        if gtin:
            ngdata_product = await self.search_by_gtin(gtin)

        # Fall back to name search if GTIN search failed
        if not ngdata_product and name:
            # Use AI to generate product name variations
            name_variations = await self.name_cleaner.clean_product_name(name)
            logger.info(f"Trying {len(name_variations)} name variations for '{name}'")

            # Try each variation until we find a match
            for variation in name_variations:
                logger.info(f"Searching Ngdata for: '{variation}'")
                ngdata_product = await self.search_by_name(variation)
                if ngdata_product:
                    logger.info(f"Found product with variation '{variation}': {ngdata_product.get('title')}")
                    break

        if not ngdata_product:
            logger.warning(f"Product not found in Ngdata for GTIN: {gtin}, Name: {name}")
            return False

        try:
            # Transform to Matinfo format
            transformed_data = self._transform_to_matinfo_format(ngdata_product)
            product_data = transformed_data["product"]
            allergen_data = transformed_data["allergens"]
            nutrient_data = transformed_data["nutrients"]

            # Check if product exists
            stmt = select(MatinfoProduct).where(MatinfoProduct.gtin == product_data["gtin"])
            result = await self.db.execute(stmt)
            existing_product = result.scalar_one_or_none()

            if existing_product:
                # Update existing product
                for key, value in product_data.items():
                    setattr(existing_product, key, value)

                # Delete existing allergens and nutrients
                await self.db.execute(
                    delete(MatinfoAllergen).where(
                        MatinfoAllergen.productid == existing_product.id
                    )
                )
                await self.db.execute(
                    delete(MatinfoNutrient).where(
                        MatinfoNutrient.productid == existing_product.id
                    )
                )
            else:
                # Create new product
                existing_product = MatinfoProduct(**product_data)
                self.db.add(existing_product)

            # Flush to ensure product is saved
            await self.db.flush()

            # Get next allergenid from sequence
            result = await self.db.execute(
                select(func.coalesce(func.max(MatinfoAllergen.allergenid), 0) + 1)
            )
            next_allergenid = result.scalar()

            # Add allergens with explicit allergenid
            for idx, allergen_dict in enumerate(allergen_data):
                allergen_dict_with_id = {
                    **allergen_dict,
                    "allergenid": next_allergenid + idx,
                    "productid": existing_product.id
                }
                allergen = MatinfoAllergen(**allergen_dict_with_id)
                self.db.add(allergen)

            # Get next nutrientid from sequence
            result = await self.db.execute(
                select(func.coalesce(func.max(MatinfoNutrient.nutrientid), 0) + 1)
            )
            next_nutrientid = result.scalar()

            # Add nutrients with explicit nutrientid
            for idx, nutrient_dict in enumerate(nutrient_data):
                nutrient_dict_with_id = {
                    **nutrient_dict,
                    "nutrientid": next_nutrientid + idx,
                    "productid": existing_product.id
                }
                nutrient = MatinfoNutrient(**nutrient_dict_with_id)
                self.db.add(nutrient)

            await self.db.commit()
            logger.info(f"Successfully synced product from Ngdata: {product_data['gtin']}")
            return True

        except Exception as e:
            logger.error(f"Error syncing product from Ngdata: {e}")
            await self.db.rollback()
            return False
