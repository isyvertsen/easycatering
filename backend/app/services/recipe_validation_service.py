"""Recipe Validation Service using AI.

Validates recipes before PDF generation to detect unusual ingredient amounts
(e.g., excessive salt, pepper, or other ingredients).
"""
import json
import logging
from typing import Optional, Dict, Any, List

from pydantic import BaseModel

from app.services.ai_client import AIClient, get_default_ai_client
from app.core.config import settings

logger = logging.getLogger(__name__)


class ValidationWarning(BaseModel):
    """Represents a warning about an ingredient in a recipe."""
    ingredient: str
    amount_per_portion: float
    unit: str
    reason: str
    severity: str  # "high", "medium", "low"


class RecipeValidationResult(BaseModel):
    """Result of recipe validation."""
    is_valid: bool
    warnings: List[ValidationWarning]
    summary: str


class RecipeValidationService:
    """Service for validating recipes using AI."""

    def __init__(self, ai_client: Optional[AIClient] = None):
        """Initialize service with AI client.

        Args:
            ai_client: AI client to use. If None, uses default client.
        """
        try:
            self._ai_client = ai_client or get_default_ai_client()
            self._available = self._ai_client.is_configured()
        except Exception as e:
            logger.warning(f"AI client not available: {e}")
            self._ai_client = None
            self._available = False

    def is_available(self) -> bool:
        """Check if AI validation is available."""
        return self._available

    async def validate_recipe(
        self,
        kalkyle_info: Dict[str, Any],
        ingredienser: List[Dict[str, Any]]
    ) -> RecipeValidationResult:
        """Validate recipe using AI and return structured warnings.

        Args:
            kalkyle_info: Recipe metadata (kalkylenavn, antallporsjoner, etc.)
            ingredienser: List of ingredients with amounts

        Returns:
            RecipeValidationResult with warnings if any issues found
        """
        # If feature flag is disabled, skip validation
        if not settings.FEATURE_AI_RECIPE_VALIDATION:
            logger.info("AI recipe validation is disabled via feature flag")
            return RecipeValidationResult(
                is_valid=True,
                warnings=[],
                summary="AI validation disabled"
            )

        # If AI not available, skip validation (fail-open)
        if not self._available or not self._ai_client:
            logger.info("AI validation not available, skipping validation")
            return RecipeValidationResult(
                is_valid=True,
                warnings=[],
                summary="AI validation unavailable"
            )

        try:
            # Build ingredient list for prompt
            ingredient_lines = []
            for ing in ingredienser:
                produkt = ing.get("produktnavn", "Ukjent produkt")
                mengde = ing.get("mengde_per_porsjon", 0)
                enhet = ing.get("enhetsnavn", "")
                ingredient_lines.append(f"- {produkt}: {mengde}{enhet} per porsjon")

            ingredient_text = "\n".join(ingredient_lines)

            # Build AI prompt
            prompt = self._build_validation_prompt(
                kalkyle_info.get("kalkylenavn", "Oppskrift"),
                kalkyle_info.get("antallporsjoner", 1),
                ingredient_text
            )

            # Call AI
            messages = [
                {"role": "system", "content": "Du er en ernæringsekspert og kokkefaglig rådgiver for Larvik Kommune Catering."},
                {"role": "user", "content": prompt}
            ]

            response = await self._ai_client.chat_completion(
                messages=messages,
                temperature=0.3,  # Lower temperature for more consistent results
                max_tokens=1500
            )

            # Parse JSON response
            result = self._parse_ai_response(response)
            logger.info(f"Recipe validation completed: {result.summary}")
            return result

        except Exception as e:
            logger.error(f"Error during recipe validation: {e}", exc_info=True)
            # Fail-open: If validation fails, return as valid
            return RecipeValidationResult(
                is_valid=True,
                warnings=[],
                summary="Validation error, assuming recipe is OK"
            )

    def _build_validation_prompt(
        self,
        recipe_name: str,
        portions: int,
        ingredient_text: str
    ) -> str:
        """Build the AI validation prompt.

        Args:
            recipe_name: Name of the recipe
            portions: Number of portions
            ingredient_text: Formatted ingredient list

        Returns:
            Prompt string for AI
        """
        return f"""Analyser følgende oppskrift og identifiser potensielle feil i mengdeangivelser:

OPPSKRIFT: {recipe_name}
PORSJONER: {portions}

INGREDIENSER:
{ingredient_text}

REFERANSEVERDIER (norsk matlaging per porsjon):
- Salt: 1-2g per porsjon (max 5-8g for 4 porsjoner)
- Pepper: 0.5-1g per porsjon
- Sukker i salte retter: Uvanlig hvis >10g per porsjon
- Olje/smør: 10-30g per porsjon typisk
- Sterke krydder (chili, wasabi, paprika): <5g per porsjon
- Eddik/sitronsaft: 5-15ml per porsjon typisk
- Soyasaus/fiskesaus: 5-10ml per porsjon

SEVERITY LEVELS:
- "high": Mengden er potensielt farlig eller vil helt ødelegge retten
- "medium": Mengden er uvanlig høy, bør sjekkes
- "low": Mengden er på den høye siden, men kan være OK

RETURNER NØR JSON (ingen forklaring, kun JSON):
{{
  "warnings": [
    {{
      "ingredient": "Salt",
      "amount_per_portion": 15.0,
      "unit": "g",
      "reason": "Uvanlig høy mengde salt (15g per porsjon). Normalt er 1-2g per porsjon.",
      "severity": "high"
    }}
  ],
  "is_valid": false,
  "summary": "Oppskriften har uvanlig høy saltmengde"
}}

Hvis alt er normalt: {{"warnings": [], "is_valid": true, "summary": "Oppskriften ser normal ut"}}

RETURNER KUN JSON, INGEN ANNEN TEKST."""

    def _parse_ai_response(self, response: str) -> RecipeValidationResult:
        """Parse AI response into validation result.

        Args:
            response: Raw AI response text

        Returns:
            RecipeValidationResult

        Raises:
            ValueError: If response cannot be parsed
        """
        try:
            # Clean response - remove markdown code blocks if present
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            # Parse JSON
            data = json.loads(cleaned)

            # Convert to Pydantic models
            warnings = [
                ValidationWarning(**w) for w in data.get("warnings", [])
            ]

            return RecipeValidationResult(
                is_valid=data.get("is_valid", True),
                warnings=warnings,
                summary=data.get("summary", "")
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.debug(f"Raw response: {response}")
            # Return safe default
            return RecipeValidationResult(
                is_valid=True,
                warnings=[],
                summary="Kunne ikke tolke AI-respons, antar at oppskriften er OK"
            )
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}", exc_info=True)
            return RecipeValidationResult(
                is_valid=True,
                warnings=[],
                summary="Feil ved tolking av validering"
            )
