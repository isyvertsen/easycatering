"""Service for generating dish names using AI or rule-based approach."""
from typing import List, Optional
import logging
from app.services.ai_client import get_default_ai_client, AIClient
from app.core.config import settings

logger = logging.getLogger(__name__)


class DishNameGenerator:
    """Generate dish names from recipe and product components."""

    def __init__(self, ai_client: Optional[AIClient] = None):
        self._ai_client = ai_client

    @property
    def ai_client(self) -> AIClient:
        """Lazy-load AI client."""
        if self._ai_client is None:
            self._ai_client = get_default_ai_client()
        return self._ai_client

    async def generate_name(
        self,
        recipes: List[dict],
        products: List[dict]
    ) -> str:
        """
        Generate a dish name from components.

        Args:
            recipes: List of recipe dicts with 'name' and 'amount_grams'
            products: List of product dicts with 'name' and 'amount_grams'

        Returns:
            Generated dish name
        """
        # If feature flag is disabled, use rule-based generation
        if not settings.FEATURE_AI_DISH_NAME_GENERATOR:
            logger.info("AI dish name generator is disabled via feature flag")
            return self._generate_rule_based(recipes, products)

        # Try AI if configured
        try:
            if self.ai_client.is_configured():
                return await self._generate_with_ai(recipes, products)
        except ValueError as e:
            logger.warning(f"AI provider not configured: {e}")
        except Exception as e:
            logger.warning(f"AI generation failed: {e}, falling back to rule-based")

        # Fallback to rule-based generation
        return self._generate_rule_based(recipes, products)

    async def _generate_with_ai(
        self,
        recipes: List[dict],
        products: List[dict]
    ) -> str:
        """Generate name using AI client."""
        # Combine all components and sort by amount (largest first)
        all_components = []
        for recipe in recipes:
            all_components.append({
                'name': recipe['name'],
                'amount': recipe['amount_grams'],
                'type': 'recipe'
            })
        for product in products:
            all_components.append({
                'name': product['name'],
                'amount': product['amount_grams'],
                'type': 'product'
            })

        # Sort by amount descending - largest portions first (main dishes)
        all_components.sort(key=lambda x: x['amount'], reverse=True)

        # Build component list with sorted order
        components_text = "\n".join([
            f"- {comp['name']} ({comp['amount']}g)"
            for comp in all_components
        ])

        prompt = f"""Du er en profesjonell kokk. Lag et kort og appetittlig navn på en rett basert på følgende komponenter:

{components_text}

VIKTIGE REGLER:
1. Navnet skal være på norsk og små bokstaver
2. Maks 4-5 ord totalt
3. Komponentene er sortert etter mengde - de største mengdene er hovedretten
4. Start ALLTID med hovedkomponenten (den med størst mengde)
5. Bruk "med" for å legge til mindre komponenter/tilbehør
6. ALDRI gjenta samme ingrediens to ganger i navnet
7. Hvis en komponent er en saus/tilbehør til en annen komponent, kombiner dem naturlig
8. Unngå mengder og detaljer i navnet
9. Vær beskrivende men konsis

EKSEMPLER PÅ GODE NAVN:
- Kjøttkaker med saus (IKKE "Saus til Kjøttkaker med Kjøttkaker")
- Lasagne med salat
- Kylling med ris og grønnsaker
- Fiskegrateng med poteter

Svar kun med rettens navn, ingenting annet."""

        generated_name = await self.ai_client.chat_completion(
            messages=[
                {"role": "system", "content": "Du er en profesjonell kokk som lager kreative rettenavn."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=50,
        )

        # Remove quotes if present
        generated_name = generated_name.strip().strip('"\'')

        return generated_name

    def _generate_rule_based(
        self,
        recipes: List[dict],
        products: List[dict]
    ) -> str:
        """Generate name using simple rules when AI is not available."""
        # Combine all components with amounts
        all_components = []

        # Add recipes
        for recipe in recipes:
            all_components.append({
                'name': recipe['name'],
                'amount': recipe['amount_grams']
            })

        # Add products
        for product in products:
            all_components.append({
                'name': product['name'],
                'amount': product['amount_grams']
            })

        if not all_components:
            return "Sammensatt rett"

        # Sort by amount descending - largest portions first (main dish)
        all_components.sort(key=lambda x: x['amount'], reverse=True)

        # Extract just the names in sorted order
        sorted_names = [comp['name'] for comp in all_components]

        # Simple rules - always start with the main component (largest amount)
        if len(sorted_names) == 1:
            return sorted_names[0].lower()
        elif len(sorted_names) == 2:
            return f"{sorted_names[0].lower()} med {sorted_names[1].lower()}"
        elif len(sorted_names) == 3:
            return f"{sorted_names[0].lower()} med {sorted_names[1].lower()} og {sorted_names[2].lower()}"
        else:
            # For more than 3, use the main ones
            main = sorted_names[0]
            return f"{main.lower()} med {len(sorted_names)-1} komponenter"


# Singleton instance
_dish_name_generator = None


def get_dish_name_generator() -> DishNameGenerator:
    """Get or create the dish name generator singleton."""
    global _dish_name_generator
    if _dish_name_generator is None:
        _dish_name_generator = DishNameGenerator()
    return _dish_name_generator
