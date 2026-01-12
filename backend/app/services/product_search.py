"""Product search service supporting both database and LLM search."""
import httpx
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, cast, String
from sqlalchemy.orm import selectinload
import logging

from app.models.matinfo_products import MatinfoProduct as ProductDetail
from app.models.produkter import Produkter
from app.core.config import settings
from app.core.gtin_utils import normalize_gtin

logger = logging.getLogger(__name__)


class ProductSearchService:
    """Service for searching products using database or LLM."""
    
    def __init__(self):
        self.anythingllm_url = settings.ANYTHINGLLM_API_URL
        self.anythingllm_key = settings.ANYTHINGLLM_API_KEY
        self.workspace_slug = settings.ANYTHINGLLM_WORKSPACE_SLUG
    
    async def search_database(
        self, 
        query: str, 
        session: AsyncSession,
        limit: int = 20,
        offset: int = 0,
        include_details: bool = True
    ) -> Dict[str, Any]:
        """
        Search products directly in database.
        Searches in product details (name, ingredients, producer) and links to tblprodukter via GTIN.
        """
        try:
            search_term = f"%{query}%"
            
            if include_details:
                # Search in detailed products table
                stmt = (
                    select(ProductDetail)
                    .where(
                        or_(
                            ProductDetail.name.ilike(search_term),
                            ProductDetail.ingredientstatement.ilike(search_term),
                            ProductDetail.producername.ilike(search_term),
                            ProductDetail.brandname.ilike(search_term),
                            ProductDetail.gtin.ilike(search_term)
                        )
                    )
                    .options(
                        selectinload(ProductDetail.allergens),
                        selectinload(ProductDetail.nutrients)
                    )
                    .offset(offset)
                    .limit(limit)
                )
                
                # Get total count
                count_stmt = (
                    select(func.count())
                    .select_from(ProductDetail)
                    .where(
                        or_(
                            ProductDetail.name.ilike(search_term),
                            ProductDetail.ingredientstatement.ilike(search_term),
                            ProductDetail.producername.ilike(search_term),
                            ProductDetail.brandname.ilike(search_term),
                            ProductDetail.gtin.ilike(search_term)
                        )
                    )
                )
                
                result = await session.execute(stmt)
                products = result.scalars().all()
                
                count_result = await session.execute(count_stmt)
                total = count_result.scalar()
                
                # Convert to response format
                items = []
                for product in products:
                    # Try to find linked product in tblprodukter
                    linked_product = None
                    if product.gtin:
                        # Normalize GTIN for matching (pad to 14 digits)
                        normalized_gtin = normalize_gtin(product.gtin)
                        linked_stmt = select(Produkter).where(
                            func.lpad(func.regexp_replace(Produkter.ean_kode, r'[^0-9]', '', 'g'), 14, '0') == normalized_gtin
                        )
                        linked_result = await session.execute(linked_stmt)
                        linked_product = linked_result.scalar_one_or_none()
                    
                    items.append({
                        "id": product.id,
                        "gtin": product.gtin,
                        "name": product.name,
                        "producer": product.producername,
                        "brand": product.brandname,
                        "ingredients": product.ingredientstatement,
                        "linked_product": {
                            "produktid": linked_product.produktid,
                            "produktnavn": linked_product.produktnavn,
                            "pris": linked_product.pris,
                            "lagermengde": linked_product.lagermengde
                        } if linked_product else None,
                        "allergens": [
                            {
                                "code": a.code,
                                "name": a.name,
                                "level": a.level
                            } for a in product.allergens
                        ],
                        "nutrients": [
                            {
                                "code": n.code,
                                "name": n.name,
                                "measurement": float(n.measurement) if n.measurement else 0,
                                "type": n.measurementtype
                            } for n in product.nutrients
                        ]
                    })
            else:
                # Search in tblprodukter (legacy products table)
                stmt = (
                    select(Produkter)
                    .where(
                        or_(
                            Produkter.produktnavn.ilike(search_term),
                            Produkter.visningsnavn.ilike(search_term),
                            Produkter.ean_kode.ilike(search_term),
                            cast(Produkter.leverandorsproduktnr, String).ilike(search_term)
                        )
                    )
                    .offset(offset)
                    .limit(limit)
                )
                
                result = await session.execute(stmt)
                products = result.scalars().all()
                
                items = []
                for product in products:
                    items.append({
                        "produktid": product.produktid,
                        "produktnavn": product.produktnavn,
                        "ean_kode": product.ean_kode,
                        "pris": product.pris,
                        "lagermengde": product.lagermengde,
                        "visningsnavn": product.visningsnavn,
                        "leverandorsproduktnr": product.leverandorsproduktnr
                    })
                
                total = len(items)  # Simplified for now
            
            return {
                "success": True,
                "source": "database",
                "query": query,
                "total": total,
                "items": items
            }
            
        except Exception as e:
            logger.error(f"Database search error: {str(e)}")
            return {
                "success": False,
                "source": "database",
                "query": query,
                "error": str(e),
                "items": []
            }
    
    async def search_llm(
        self, 
        query: str,
        session: AsyncSession,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Search using AnythingLLM for semantic/natural language search.
        """
        if not self.anythingllm_key:
            return {
                "success": False,
                "source": "llm",
                "query": query,
                "error": "AnythingLLM API key not configured",
                "items": []
            }
        
        try:
            async with httpx.AsyncClient() as client:
                # Query AnythingLLM
                response = await client.post(
                    f"{self.anythingllm_url}/workspace/{self.workspace_slug}/chat",
                    headers={
                        "Authorization": f"Bearer {self.anythingllm_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "message": f"Finn produkter som matcher: {query}. Returner GTIN-koder for relevante produkter.",
                        "mode": "query"
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return {
                        "success": False,
                        "source": "llm",
                        "query": query,
                        "error": f"AnythingLLM API error: {response.status_code}",
                        "items": []
                    }
                
                llm_response = response.json()
                
                # Extract GTINs from LLM response
                # This assumes the LLM returns GTINs in its response
                # You may need to adjust based on your AnythingLLM setup
                gtins = self._extract_gtins_from_response(llm_response.get("textResponse", ""))
                
                if not gtins:
                    return {
                        "success": True,
                        "source": "llm",
                        "query": query,
                        "message": "No products found matching your query",
                        "items": []
                    }
                
                # Fetch products by GTINs
                stmt = (
                    select(ProductDetail)
                    .where(ProductDetail.gtin.in_(gtins))
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
                    # Link to tblprodukter
                    linked_product = None
                    if product.gtin:
                        # Normalize GTIN for matching (pad to 14 digits)
                        normalized_gtin = normalize_gtin(product.gtin)
                        linked_stmt = select(Produkter).where(
                            func.lpad(func.regexp_replace(Produkter.ean_kode, r'[^0-9]', '', 'g'), 14, '0') == normalized_gtin
                        )
                        linked_result = await session.execute(linked_stmt)
                        linked_product = linked_result.scalar_one_or_none()
                    
                    items.append({
                        "id": product.id,
                        "gtin": product.gtin,
                        "name": product.name,
                        "producer": product.producername,
                        "brand": product.brandname,
                        "ingredients": product.ingredientstatement,
                        "linked_product": {
                            "produktid": linked_product.produktid,
                            "produktnavn": linked_product.produktnavn,
                            "pris": linked_product.pris,
                            "lagermengde": linked_product.lagermengde
                        } if linked_product else None,
                        "relevance_reason": llm_response.get("sources", [])
                    })
                
                return {
                    "success": True,
                    "source": "llm",
                    "query": query,
                    "total": len(items),
                    "items": items,
                    "llm_response": llm_response.get("textResponse", "")
                }
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "source": "llm",
                "query": query,
                "error": "LLM search timeout",
                "items": []
            }
        except Exception as e:
            logger.error(f"LLM search error: {str(e)}")
            return {
                "success": False,
                "source": "llm",
                "query": query,
                "error": str(e),
                "items": []
            }
    
    def _extract_gtins_from_response(self, text: str) -> List[str]:
        """Extract GTIN codes from LLM response text."""
        import re
        
        # Look for 13-digit or 8-digit numbers that could be GTINs
        gtin_pattern = r'\b\d{13}\b|\b\d{8}\b'
        potential_gtins = re.findall(gtin_pattern, text)
        
        # Validate GTINs (basic validation)
        valid_gtins = []
        for gtin in potential_gtins:
            if len(gtin) in [8, 13]:
                valid_gtins.append(gtin)
        
        return valid_gtins[:20]  # Limit to 20 GTINs