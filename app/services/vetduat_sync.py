"""Service for syncing product data from VetDuAt API."""
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


class VetDuAtSyncService:
    """Service for syncing product data from VetDuAt API."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://vetduatbffapi.tradesolution.no/api/products"
        self.name_cleaner = ProductNameCleaner()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def search_by_gtin(self, gtin: str) -> Optional[Dict]:
        """
        Search for product by GTIN in VetDuAt API.

        Args:
            gtin: The GTIN code to search for.

        Returns:
            Product data dictionary or None if not found.
        """
        search_payload = {
            "facets": [
                "Produksjonsland,count:10,sort:count",
                "AllergenerInneholder,count:10,sort:count",
                "AllergenerInneholderIkke,count:10,sort:count",
                "AllergenerKanInneholde,count:10,sort:count",
                "KategoriNavn,count:10,sort:count",
                "Varemerke,count:10,sort:count",
                "Varegruppenavn,count:10,sort:count",
                "FirmaNavn,count:10,sort:count",
                "MerkeOrdninger,count:10,sort:count",
                "ErStorhusholdningsprodukt,count:10,sort:count"
            ],
            "top": 1,
            "skip": 0,
            "count": True,
            "number": 0,
            "search": gtin
        }

        try:
            logger.info(f"Searching VetDuAt for GTIN: {gtin}")
            response = await self.client.post(
                f"{self.base_url}/search",
                json=search_payload,
                headers={
                    "Content-Type": "application/json",
                    "Origin": "https://vetduat.no"
                }
            )

            if response.status_code == 404:
                logger.warning(f"Product not found for GTIN: {gtin}")
                return None

            response.raise_for_status()
            data = response.json()

            products = data.get("products", [])
            if not products:
                logger.warning(f"No products found for GTIN: {gtin}")
                return None

            # Return first match
            product = products[0]
            logger.info(f"Found product in VetDuAt: {product.get('fellesProduktnavn')}")
            return product

        except httpx.HTTPError as e:
            logger.error(f"Error searching VetDuAt for GTIN {gtin}: {e}")
            return None

    async def search_by_name(self, name: str) -> Optional[Dict]:
        """
        Search for product by name in VetDuAt API.

        Args:
            name: The product name to search for.

        Returns:
            Product data dictionary or None if not found.
        """
        search_payload = {
            "facets": [
                "Produksjonsland,count:10,sort:count",
                "AllergenerInneholder,count:10,sort:count",
                "AllergenerInneholderIkke,count:10,sort:count",
                "AllergenerKanInneholde,count:10,sort:count",
                "KategoriNavn,count:10,sort:count",
                "Varemerke,count:10,sort:count",
                "Varegruppenavn,count:10,sort:count",
                "FirmaNavn,count:10,sort:count",
                "MerkeOrdninger,count:10,sort:count",
                "ErStorhusholdningsprodukt,count:10,sort:count"
            ],
            "top": 20,
            "skip": 0,
            "count": True,
            "number": 0,
            "search": name
        }

        try:
            logger.info(f"Searching VetDuAt for name: {name}")
            response = await self.client.post(
                f"{self.base_url}/search",
                json=search_payload,
                headers={
                    "Content-Type": "application/json",
                    "Origin": "https://vetduat.no"
                }
            )

            if response.status_code == 404:
                logger.warning(f"Product not found for name: {name}")
                return None

            response.raise_for_status()
            data = response.json()

            products = data.get("products", [])
            if not products:
                logger.warning(f"No products found for name: {name}")
                return None

            # Return first match (best score)
            product = products[0]
            logger.info(f"Found product in VetDuAt: {product.get('fellesProduktnavn')} (score: {product.get('searchScore')})")
            return product

        except httpx.HTTPError as e:
            logger.error(f"Error searching VetDuAt for name {name}: {e}")
            return None

    def _map_allergen_level(self, allergen_type: str) -> int:
        """Map VetDuAt allergen type to Matinfo level."""
        mapping = {
            "inneholder": 2,      # CONTAINS
            "kan_inneholde": 1,   # MAY_CONTAIN
            "inneholder_ikke": 0  # FREE_FROM
        }
        return mapping.get(allergen_type, 0)

    def _extract_allergens_from_facets(self, facets: Dict) -> List[Dict]:
        """
        Extract allergen data from VetDuAt facets.

        Args:
            facets: Facets dictionary from VetDuAt response.

        Returns:
            List of allergen dictionaries in Matinfo format.
        """
        allergens = []
        allergen_map = {}

        # Process "inneholder" (contains)
        for allergen_item in facets.get("AllergenerInneholder", {}).get("facets", []):
            allergen_name = allergen_item.get("value")
            if allergen_name:
                allergen_map[allergen_name] = 2  # CONTAINS

        # Process "kan inneholde" (may contain)
        for allergen_item in facets.get("AllergenerKanInneholde", {}).get("facets", []):
            allergen_name = allergen_item.get("value")
            if allergen_name and allergen_name not in allergen_map:
                allergen_map[allergen_name] = 1  # MAY_CONTAIN

        # Process "inneholder ikke" (free from)
        for allergen_item in facets.get("AllergenerInneholderIkke", {}).get("facets", []):
            allergen_name = allergen_item.get("value")
            if allergen_name and allergen_name not in allergen_map:
                allergen_map[allergen_name] = 0  # FREE_FROM

        # Convert to list format
        # Map Norwegian allergen names to codes (simplified mapping)
        code_mapping = {
            "Gluten": "AW",
            "Hvete gluten": "UW",
            "Rug gluten": "NR",
            "Bygg gluten": "GB",
            "Havre gluten": "GO",
            "Spelt gluten": "GS",
            "Khorasanhvete gluten": "GK",
            "Skalldyr": "AC",
            "Egg": "AE",
            "Fisk": "AF",
            "Peanøtter": "AP",
            "Soya": "AY",
            "Melk": "AM",
            "Mandler": "SA",
            "Hasselnøtter": "SH",
            "Valnøtter": "SW",
            "Kasjunøtter": "SC",
            "Pekannøtter": "SP",
            "Paranøtter": "SR",
            "Pistasjnøtter": "ST",
            "Makadamianøtter": "SM",
            "Selleri": "BC",
            "Sennep": "BM",
            "Sesamfrø": "AS",
            "Svoveldioksid": "AU",
            "Lupiner": "NL",
            "Bløtdyr": "UM"
        }

        for allergen_name, level in allergen_map.items():
            code = code_mapping.get(allergen_name, allergen_name[:2].upper())
            allergens.append({
                "code": code,
                "name": allergen_name,
                "level": level
            })

        return allergens

    def _transform_to_matinfo_format(self, vetduat_data: Dict, facets: Dict = None) -> Dict:
        """
        Transform VetDuAt product data to Matinfo format.

        Args:
            vetduat_data: Product data from VetDuAt API.
            facets: Optional facets data for allergen info.

        Returns:
            Dictionary in Matinfo Product format.
        """
        # Normalize GTIN to ensure correct format with leading zeros
        raw_gtin = vetduat_data.get("gtin", "")
        gtin = normalize_gtin(raw_gtin)

        if not gtin:
            logger.warning(f"Invalid GTIN from VetDuAt API: {raw_gtin}")
            gtin = raw_gtin  # Keep original if normalization fails

        product_id = f"matinfo_{gtin}"

        # Extract allergens from facets if available
        allergens = []
        if facets:
            allergens = self._extract_allergens_from_facets(facets)

        # Build product data
        product_data = {
            "id": product_id,
            "gtin": gtin,
            "name": vetduat_data.get("fellesProduktnavn"),
            "itemnumber": str(vetduat_data.get("epdNr", "")),
            "epdnumber": str(vetduat_data.get("epdNr", "")),
            "producername": vetduat_data.get("firmaNavn"),
            "providername": vetduat_data.get("firmaNavn"),
            "brandname": facets.get("Varemerke", {}).get("facets", [{}])[0].get("value", "") if facets else "",
            "ingredientstatement": "",  # VetDuAt doesn't have this
            "producturl": "",
            "markings": ",".join(vetduat_data.get("merkeordninger", [])),
            "images": "",
            "packagesize": f"{vetduat_data.get('mengde', '')} {vetduat_data.get('mengdetypeenhet', '')}".strip(),
            "updated": datetime.now().isoformat()
        }

        # Return both product and allergens
        return {
            "product": product_data,
            "allergens": allergens,
            "nutrients": []  # VetDuAt doesn't have nutrient data
        }

    async def sync_product(self, gtin: str = None, name: str = None) -> bool:
        """
        Sync a product from VetDuAt API to our database.
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

        vetduat_product = None
        facets = None

        # Try GTIN search first
        if gtin:
            search_response = await self.client.post(
                f"{self.base_url}/search",
                json={
                    "facets": [
                        "Produksjonsland,count:10,sort:count",
                        "AllergenerInneholder,count:50,sort:count",
                        "AllergenerInneholderIkke,count:50,sort:count",
                        "AllergenerKanInneholde,count:50,sort:count",
                        "KategoriNavn,count:10,sort:count",
                        "Varemerke,count:10,sort:count",
                        "Varegruppenavn,count:10,sort:count",
                        "FirmaNavn,count:10,sort:count",
                        "MerkeOrdninger,count:10,sort:count",
                        "ErStorhusholdningsprodukt,count:10,sort:count"
                    ],
                    "top": 1,
                    "skip": 0,
                    "count": True,
                    "number": 0,
                    "search": gtin
                },
                headers={
                    "Content-Type": "application/json",
                    "Origin": "https://vetduat.no"
                }
            )

            if search_response.status_code == 200:
                data = search_response.json()
                products = data.get("products", [])
                if products:
                    vetduat_product = products[0]
                    facets = data.get("facets", {})
                    logger.info(f"Found product by GTIN: {gtin}")

        # Fall back to name search if GTIN search failed
        if not vetduat_product and name:
            # Use AI to generate product name variations
            name_variations = await self.name_cleaner.clean_product_name(name)
            logger.info(f"Trying {len(name_variations)} name variations for '{name}'")

            # Try each variation until we find a match
            for variation in name_variations:
                logger.info(f"Searching VetDuAt for: '{variation}'")

                search_response = await self.client.post(
                    f"{self.base_url}/search",
                    json={
                        "facets": [
                            "Produksjonsland,count:10,sort:count",
                            "AllergenerInneholder,count:50,sort:count",
                            "AllergenerInneholderIkke,count:50,sort:count",
                            "AllergenerKanInneholde,count:50,sort:count",
                            "KategoriNavn,count:10,sort:count",
                            "Varemerke,count:10,sort:count",
                            "Varegruppenavn,count:10,sort:count",
                            "FirmaNavn,count:10,sort:count",
                            "MerkeOrdninger,count:10,sort:count",
                            "ErStorhusholdningsprodukt,count:10,sort:count"
                        ],
                        "top": 1,
                        "skip": 0,
                        "count": True,
                        "number": 0,
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
                    if products:
                        vetduat_product = products[0]
                        facets = data.get("facets", {})
                        logger.info(f"Found product with variation '{variation}': {vetduat_product.get('fellesProduktnavn')}")
                        break  # Stop on first match

        if not vetduat_product:
            logger.warning(f"Product not found in VetDuAt for GTIN: {gtin}, Name: {name}")
            return False

        try:
            # Transform to Matinfo format
            transformed_data = self._transform_to_matinfo_format(vetduat_product, facets)
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

            await self.db.commit()
            logger.info(f"Successfully synced product from VetDuAt: {product_data['gtin']}")
            return True

        except Exception as e:
            logger.error(f"Error syncing product from VetDuAt: {e}")
            await self.db.rollback()
            return False
