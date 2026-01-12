"""Service for cleaning product names using AI to improve search results."""
import logging
from typing import List, Optional
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)


class ProductNameCleaner:
    """Clean product names using AI to extract core product name."""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL or "gpt-4-turbo"

    async def clean_product_name(self, product_name: str) -> List[str]:
        """
        Clean a product name to extract searchable variations.

        Returns a list of product name variations to try, ordered by priority:
        1. Full original name
        2. Name without quantities/units
        3. Name without brand/supplier
        4. Core product name only

        Examples:
            "Idun Mandelessens 10ml" -> ["Idun Mandelessens 10ml", "Idun Mandelessens", "Mandelessens"]
            "EGG FIRST PRICE 12STK" -> ["EGG FIRST PRICE 12STK", "EGG FIRST PRICE", "EGG"]
            "LAKSELOINS FR U SB BRB" -> ["LAKSELOINS FR U SB BRB", "LAKSELOINS", "LAKS"]
        """
        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not configured, returning original name only")
            return [product_name]

        try:
            prompt = f"""Du er en ekspert på norske matvareprodukt. Analyser følgende produktnavn og gi meg flere søkevarianter, ordnet fra mest spesifikk til mest generisk:

Produktnavn: "{product_name}"

Regler:
1. Fjern mengdeangivelser (10ml, 12stk, 500g, etc.) i andre variant
2. Fjern leverandør/merkenavn (Idun, First Price, Toro, etc.) i tredje variant
3. Ekstrah er kjerneproduktet i fjerde variant
4. Fjern forkortelser uten mening (FR, U, SB, BRB, etc.)
5. Behold norske produktnavn (ikke oversett til engelsk)

Returner BARE en JSON-liste med navn, ingenting annet:
["variant1", "variant2", "variant3", ...]

Eksempler:
"Idun Mandelessens 10ml" -> ["Idun Mandelessens 10ml", "Idun Mandelessens", "Mandelessens"]
"EGG FIRST PRICE 12STK" -> ["EGG FIRST PRICE 12STK", "EGG FIRST PRICE", "EGG"]
"LAKSELOINS FR U SB BRB" -> ["LAKSELOINS FR U SB BRB", "LAKSELOINS", "LAKS"]
"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Du er en ekspert på norske matvareprodukt. Returner BARE JSON, ingen forklaring."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning(f"Empty response from OpenAI for product: {product_name}")
                return [product_name]

            # Parse JSON response
            import json
            variations = json.loads(content.strip())

            if not isinstance(variations, list):
                logger.warning(f"Unexpected response format from OpenAI: {content}")
                return [product_name]

            # Always include original name first if not already there
            if product_name not in variations:
                variations.insert(0, product_name)

            logger.info(f"Generated {len(variations)} variations for '{product_name}': {variations}")
            return variations

        except Exception as e:
            logger.error(f"Error cleaning product name '{product_name}': {e}")
            return [product_name]
