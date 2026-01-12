"""Enhanced product search service with fuzzy matching, ranking, and auto-complete."""
import asyncio
import json
import logging
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, cast, String, and_, text
from sqlalchemy.orm import selectinload
from fuzzywuzzy import fuzz
from collections import defaultdict
import redis.asyncio as redis

from app.models.matinfo_products import MatinfoProduct as ProductDetail, MatinfoNutrient, MatinfoAllergen
from app.models.produkter import Produkter
from app.core.config import settings
from app.core.gtin_utils import normalize_gtin

logger = logging.getLogger(__name__)


class EnhancedProductSearchService:
    """Enhanced service for searching products with fuzzy matching and ranking."""

    def __init__(self):
        self.redis_client = None
        self.init_redis()

    def init_redis(self):
        """Initialize Redis connection for caching."""
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST if hasattr(settings, 'REDIS_HOST') else 'localhost',
                port=settings.REDIS_PORT if hasattr(settings, 'REDIS_PORT') else 6379,
                decode_responses=True
            )
        except Exception as e:
            logger.warning(f"Redis not available: {e}. Continuing without caching.")
            self.redis_client = None

    async def fuzzy_search(
        self,
        query: str,
        session: AsyncSession,
        limit: int = 20,
        offset: int = 0,
        threshold: float = 0.3
    ) -> Dict[str, Any]:
        """
        Perform fuzzy search with ranking and scoring.

        Args:
            query: Search query string
            session: Database session
            limit: Maximum results to return
            offset: Skip this many results
            threshold: Minimum similarity score (0-1)

        Returns:
            Search results with relevance scores
        """
        try:
            # Normalize query
            query_lower = query.lower().strip()

            # Check for exact GTIN match first
            if query_lower.isdigit() and len(query_lower) in [8, 13]:
                gtin_results = await self._search_by_gtin(query_lower, session)
                if gtin_results:
                    return {
                        "success": True,
                        "source": "fuzzy_search",
                        "query": query,
                        "total": len(gtin_results),
                        "items": gtin_results
                    }

            # Fetch candidates from database
            candidates = await self._fetch_candidates(query_lower, session, limit * 3)

            # Score and rank candidates
            scored_results = []
            for product in candidates:
                score = self._calculate_relevance_score(query_lower, product)
                if score >= threshold:
                    scored_results.append((score, product))

            # Sort by score descending
            scored_results.sort(key=lambda x: x[0], reverse=True)

            # Apply pagination
            paginated_results = scored_results[offset:offset + limit]

            # Format results
            items = []
            for score, product in paginated_results:
                item = await self._format_product_result(product, session, score)
                items.append(item)

            # Track search for suggestions
            if self.redis_client:
                await self._track_search(query_lower)

            return {
                "success": True,
                "source": "fuzzy_search",
                "query": query,
                "total": len(scored_results),
                "items": items,
                "page": offset // limit + 1,
                "pages": math.ceil(len(scored_results) / limit)
            }

        except Exception as e:
            logger.error(f"Fuzzy search error: {str(e)}")
            return {
                "success": False,
                "source": "fuzzy_search",
                "query": query,
                "error": str(e),
                "items": []
            }

    async def _search_by_gtin(self, gtin: str, session: AsyncSession) -> List[Dict]:
        """Search for exact GTIN match."""
        stmt = (
            select(ProductDetail)
            .options(
                selectinload(ProductDetail.allergens),
                selectinload(ProductDetail.nutrients)
            )
            .where(
                or_(
                    ProductDetail.gtin == gtin,
                    ProductDetail.gtin.like(f"{gtin}%")
                )
            )
        )

        result = await session.execute(stmt)
        products = result.scalars().all()

        items = []
        for product in products:
            item = await self._format_product_result(product, session, 1.0)
            items.append(item)

        return items

    async def _fetch_candidates(
        self,
        query: str,
        session: AsyncSession,
        limit: int
    ) -> List[ProductDetail]:
        """Fetch candidate products from database."""
        # Use trigram similarity if PostgreSQL
        if settings.DATABASE_URL.startswith("postgresql"):
            # Create trigram index if not exists
            await session.execute(text("""
                CREATE EXTENSION IF NOT EXISTS pg_trgm;
            """))
            await session.commit()

            # Use trigram similarity search
            stmt = text("""
                SELECT * FROM products
                WHERE
                    similarity(LOWER(name), :query) > 0.1
                    OR similarity(LOWER(brandname), :query) > 0.1
                    OR similarity(LOWER(producername), :query) > 0.1
                    OR LOWER(name) LIKE :pattern
                    OR LOWER(brandname) LIKE :pattern
                    OR gtin LIKE :pattern
                ORDER BY
                    GREATEST(
                        similarity(LOWER(name), :query),
                        similarity(LOWER(brandname), :query),
                        similarity(LOWER(producername), :query)
                    ) DESC
                LIMIT :limit
            """)

            result = await session.execute(
                stmt,
                {
                    "query": query,
                    "pattern": f"%{query}%",
                    "limit": limit
                }
            )

            # Convert to ProductDetail objects
            products = []
            for row in result:
                product = await session.get(ProductDetail, row.id)
                if product:
                    await session.refresh(product, ['allergens', 'nutrients'])
                    products.append(product)

            return products
        else:
            # Fallback to ILIKE for non-PostgreSQL
            search_pattern = f"%{query}%"
            stmt = (
                select(ProductDetail)
                .options(
                    selectinload(ProductDetail.allergens),
                    selectinload(ProductDetail.nutrients)
                )
                .where(
                    or_(
                        ProductDetail.name.ilike(search_pattern),
                        ProductDetail.brandname.ilike(search_pattern),
                        ProductDetail.producername.ilike(search_pattern),
                        ProductDetail.gtin.ilike(search_pattern)
                    )
                )
                .limit(limit)
            )

            result = await session.execute(stmt)
            return result.scalars().all()

    def _calculate_relevance_score(self, query: str, product: ProductDetail) -> float:
        """
        Calculate relevance score for a product.

        Scoring factors:
        - Exact match: 1.0
        - Name similarity: 0-100
        - Brand similarity: 0-50
        - Producer similarity: 0-30
        - GTIN partial match: 0-80
        - Has nutrition data: +10
        - Has allergen data: +10
        """
        scores = []

        # Name matching (highest weight)
        if product.name:
            name_score = fuzz.token_sort_ratio(query, product.name.lower())
            scores.append(name_score * 1.0)  # Full weight

        # Brand matching
        if product.brandname:
            brand_score = fuzz.partial_ratio(query, product.brandname.lower())
            scores.append(brand_score * 0.5)  # Half weight

        # Producer matching
        if product.producername:
            producer_score = fuzz.partial_ratio(query, product.producername.lower())
            scores.append(producer_score * 0.3)  # 30% weight

        # GTIN matching
        if product.gtin and query.isdigit():
            if product.gtin.startswith(query):
                scores.append(80)
            elif query in product.gtin:
                scores.append(40)

        # Bonus for data completeness
        bonus = 0
        if product.nutrients:
            bonus += 10
        if product.allergens:
            bonus += 10

        # Calculate final score
        if scores:
            base_score = max(scores)  # Use best match
            final_score = min(100, base_score + bonus)
            return final_score / 100.0  # Normalize to 0-1

        return 0.0

    async def _format_product_result(
        self,
        product: ProductDetail,
        session: AsyncSession,
        score: float
    ) -> Dict[str, Any]:
        """Format product for response."""
        # Get linked product from tblprodukter
        linked_product = None
        if product.gtin:
            # Normalize GTIN for matching (pad to 14 digits)
            normalized_gtin = normalize_gtin(product.gtin)
            linked_stmt = select(Produkter).where(
                func.lpad(func.regexp_replace(Produkter.ean_kode, r'[^0-9]', '', 'g'), 14, '0') == normalized_gtin
            )
            linked_result = await session.execute(linked_stmt)
            linked_product = linked_result.scalar_one_or_none()

        # Calculate nutrition summary
        nutrition_summary = self._get_nutrition_summary(product.nutrients)

        # Check nutrition completeness
        nutrition_complete = self._is_nutrition_complete(product.nutrients)

        # Get use count if tracking is enabled
        use_count = 0
        last_used = None
        if self.redis_client and product.gtin:
            use_count = await self._get_product_use_count(product.gtin)
            last_used = await self._get_product_last_used(product.gtin)

        return {
            "gtin": product.gtin,
            "name": product.name,
            "brand": product.brandname,
            "size": product.packagesize,
            "unit": self._extract_unit(product.packagesize),
            "nutritionComplete": nutrition_complete,
            "nutritionSummary": nutrition_summary,
            "matchScore": round(score * 100, 1),
            "lastUsed": last_used,
            "useCount": use_count,
            "producer": product.producername,
            "ingredients": product.ingredientstatement,
            "allergens": [
                {
                    "code": a.code,
                    "name": a.name,
                    "level": self._map_allergen_level(a.level)
                }
                for a in product.allergens
            ] if product.allergens else [],
            "linkedProduct": {
                "produktid": linked_product.produktid,
                "produktnavn": linked_product.produktnavn,
                "pris": float(linked_product.pris) if linked_product.pris else None,
                "lagermengde": linked_product.lagermengde
            } if linked_product else None
        }

    def _get_nutrition_summary(self, nutrients: List[MatinfoNutrient]) -> Dict[str, float]:
        """Extract key nutrition values."""
        summary = {
            "energy_kcal": 0,
            "protein": 0,
            "fat": 0,
            "carbs": 0
        }

        if not nutrients:
            return summary

        for nutrient in nutrients:
            if nutrient.code == "ENERC_KCAL":
                summary["energy_kcal"] = float(nutrient.measurement or 0)
            elif nutrient.code == "PROCNT":
                summary["protein"] = float(nutrient.measurement or 0)
            elif nutrient.code == "FAT":
                summary["fat"] = float(nutrient.measurement or 0)
            elif nutrient.code == "CHO-":
                summary["carbs"] = float(nutrient.measurement or 0)

        return summary

    def _is_nutrition_complete(self, nutrients: List[MatinfoNutrient]) -> bool:
        """Check if all mandatory nutrition data is present."""
        if not nutrients:
            return False

        mandatory_codes = {"ENERC_KJ", "ENERC_KCAL", "PROCNT", "FAT", "CHO-", "NACL"}
        present_codes = {n.code for n in nutrients if n.measurement}

        return mandatory_codes.issubset(present_codes)

    def _extract_unit(self, package_size: str) -> str:
        """Extract unit from package size string."""
        if not package_size:
            return "stk"

        size_lower = package_size.lower()
        if "kg" in size_lower:
            return "kg"
        elif "g" in size_lower or "grm" in size_lower:
            return "g"
        elif "l" in size_lower or "liter" in size_lower:
            return "l"
        elif "ml" in size_lower:
            return "ml"
        elif "stk" in size_lower:
            return "stk"
        else:
            return "stk"

    def _map_allergen_level(self, level: Optional[int]) -> str:
        """Map allergen level integer to string.

        Database allergen levels (from actual data):
        0 = FREE_FROM (explicitly free from)
        1 = CROSS_CONTAMINATION (may contain traces / produced in same facility)
        2 = MAY_CONTAIN (may contain)
        3 = CONTAINS (contains)
        """
        level_map = {
            0: "FREE_FROM",
            1: "CROSS_CONTAMINATION",
            2: "MAY_CONTAIN",
            3: "CONTAINS"
        }
        return level_map.get(level, "UNKNOWN")

    async def _track_search(self, query: str):
        """Track search query for suggestions."""
        if not self.redis_client:
            return

        try:
            # Track search query
            key = f"search:queries:{query.lower()}"
            await self.redis_client.incr(key)
            await self.redis_client.expire(key, 86400 * 30)  # 30 days

            # Track recent searches
            recent_key = "search:recent"
            await self.redis_client.lpush(recent_key, query)
            await self.redis_client.ltrim(recent_key, 0, 99)  # Keep last 100
        except Exception as e:
            logger.warning(f"Failed to track search: {e}")

    async def _get_product_use_count(self, gtin: str) -> int:
        """Get product use count from cache."""
        if not self.redis_client:
            return 0

        try:
            key = f"product:use_count:{gtin}"
            count = await self.redis_client.get(key)
            return int(count) if count else 0
        except Exception:
            return 0

    async def _get_product_last_used(self, gtin: str) -> Optional[str]:
        """Get product last used date from cache."""
        if not self.redis_client:
            return None

        try:
            key = f"product:last_used:{gtin}"
            timestamp = await self.redis_client.get(key)
            if timestamp:
                return datetime.fromtimestamp(float(timestamp)).isoformat()
            return None
        except Exception:
            return None

    async def get_suggestions(
        self,
        query: str,
        session: AsyncSession,
        limit: int = 10
    ) -> List[str]:
        """
        Get auto-complete suggestions for a query.

        Args:
            query: Partial search query
            session: Database session
            limit: Maximum suggestions

        Returns:
            List of suggested search terms
        """
        suggestions = []
        query_lower = query.lower().strip()

        if len(query_lower) < 2:
            return suggestions

        # Get from recent searches if available
        if self.redis_client:
            try:
                recent = await self.redis_client.lrange("search:recent", 0, 50)
                for term in recent:
                    if term.lower().startswith(query_lower):
                        suggestions.append(term)
                        if len(suggestions) >= limit:
                            break
            except Exception as e:
                logger.warning(f"Failed to get recent searches: {e}")

        # Get from product names if needed
        if len(suggestions) < limit:
            stmt = (
                select(ProductDetail.name)
                .where(ProductDetail.name.ilike(f"{query}%"))
                .distinct()
                .limit(limit - len(suggestions))
            )

            result = await session.execute(stmt)
            for name, in result:
                if name and name not in suggestions:
                    suggestions.append(name)

        return suggestions[:limit]

    async def get_recent_searches(self, limit: int = 20) -> List[str]:
        """Get recent search queries."""
        if not self.redis_client:
            return []

        try:
            recent = await self.redis_client.lrange("search:recent", 0, limit - 1)
            # Remove duplicates while preserving order
            seen = set()
            unique = []
            for term in recent:
                if term not in seen:
                    seen.add(term)
                    unique.append(term)
            return unique
        except Exception as e:
            logger.warning(f"Failed to get recent searches: {e}")
            return []

    async def get_frequent_products(
        self,
        session: AsyncSession,
        recipe_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get frequently used products.

        Args:
            session: Database session
            recipe_type: Optional filter by recipe type
            limit: Maximum results

        Returns:
            List of frequently used products
        """
        # This would normally query from recipe ingredients
        # For now, return popular products
        stmt = (
            select(ProductDetail)
            .options(
                selectinload(ProductDetail.allergens),
                selectinload(ProductDetail.nutrients)
            )
            .limit(limit)
        )

        result = await session.execute(stmt)
        products = result.scalars().all()

        items = []
        for product in products:
            item = await self._format_product_result(product, session, 1.0)
            items.append(item)

        return items

    async def track_product_use(self, gtin: str):
        """Track that a product was used in a recipe."""
        if not self.redis_client or not gtin:
            return

        try:
            # Increment use count
            count_key = f"product:use_count:{gtin}"
            await self.redis_client.incr(count_key)

            # Update last used timestamp
            time_key = f"product:last_used:{gtin}"
            await self.redis_client.set(time_key, datetime.now().timestamp())

            # Set expiry to 90 days
            await self.redis_client.expire(count_key, 86400 * 90)
            await self.redis_client.expire(time_key, 86400 * 90)
        except Exception as e:
            logger.warning(f"Failed to track product use: {e}")