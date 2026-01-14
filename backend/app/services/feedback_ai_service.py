"""Service for AI-powered feedback analysis."""
from typing import Optional, Dict, Any, List
import json
import logging
from app.core.config import settings
from app.services.system_map import get_system_context, get_existing_features_by_repo
from app.services.ai_client import get_default_ai_client, AIClient

logger = logging.getLogger(__name__)


class FeedbackAIService:
    """Service for analyzing user feedback with AI."""

    def __init__(self, ai_client: Optional[AIClient] = None):
        self._ai_client = ai_client

    @property
    def ai_client(self) -> AIClient:
        """Lazy-load AI client."""
        if self._ai_client is None:
            self._ai_client = get_default_ai_client()
        return self._ai_client

    def _get_existing_features_context(self) -> str:
        """Get context about existing features in the system."""
        features = get_existing_features_by_repo()

        context = """
EKSISTERENDE FUNKSJONER I SYSTEMET:

Backend (backend/):
"""
        for feature in features["backend"]:
            context += f"- {feature}\n"

        context += "\nFrontend (frontend/):\n"
        for feature in features["frontend"]:
            context += f"- {feature}\n"

        context += "\nBegge (fullstack features):\n"
        for feature in features["both"]:
            context += f"- {feature}\n"

        return context

    async def analyze_feedback(
        self,
        feedback_type: str,  # 'bug' or 'feature'
        title: str,
        description: str,
        answers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze user feedback and provide improvements.

        Returns:
            {
                "success": bool,
                "needsMoreInfo": bool,
                "followUpQuestions": Optional[List[str]],
                "improvedTitle": Optional[str],
                "improvedDescription": Optional[str],
                "detectedTypes": Optional[List[str]],
                "existingFeature": Optional[str],
                "suggestSplit": Optional[bool],
                "targetRepositories": List[str],  # ["backend"], ["frontend"], or ["backend", "frontend"]
                "error": Optional[str]
            }
        """

        # Check if AI is configured
        try:
            if not self.ai_client.is_configured():
                return {
                    "success": False,
                    "error": "AI not configured. Please set AI provider API key in environment variables."
                }
        except ValueError as e:
            return {
                "success": False,
                "error": f"AI provider error: {e}"
            }

        # Build prompt based on feedback type
        type_label = "feilrapport" if feedback_type == "bug" else "funksjonsønske"

        system_prompt = f"""Du er en ekspert på å analysere bruker-feedback for software.
Din oppgave er å analysere en {type_label} og vurdere om den er klar og komplett.

{get_system_context()}

{self._get_existing_features_context()}

Analyser feedback og gi tilbakemelding i JSON-format:
{{
    "needsMoreInfo": boolean,  // true hvis mer info trengs
    "followUpQuestions": string[] | null,  // 1-3 spørsmål hvis needsMoreInfo=true, ellers null
    "improvedTitle": string,  // Forbedret tittel (kort og beskrivende)
    "improvedDescription": string,  // Forbedret beskrivelse med struktur
    "detectedTypes": string[],  // ["bug"] eller ["feature"] eller ["bug", "feature"] hvis begge
    "existingFeature": string | null,  // Hvis funksjonen allerede finnes, beskriv hvilken
    "suggestSplit": boolean,  // true hvis bør deles i flere issues
    "targetRepositories": string[]  // ["backend"], ["frontend"], eller ["backend", "frontend"]
}}

REGLER:
1. Hvis beskrivelsen mangler viktig info (steg for å reprodusere bug, bruksscenario, hva som forventet vs hva som skjedde), sett needsMoreInfo=true
2. Oppfølgingsspørsmål skal være konkrete og spesifikke (maks 3 spørsmål)
3. Forbedret beskrivelse skal være strukturert med overskrifter (bruk markdown)
4. For bugs: Inkluder "**Problem:**", "**Forventet:**", "**Faktisk:**", "**Steg for å reprodusere:**"
5. For features: Inkluder "**Beskrivelse:**", "**Brukstilfelle:**", "**Nytteverdi:**"
6. Sjekk nøye om ønsket funksjon allerede finnes i listen over eksisterende funksjoner
7. Foreslå split hvis det er både bug og feature i samme rapport
8. Forbedret tittel skal være kort (maks 100 tegn) og beskrivende

VIKTIG - REPOSITORY SELECTION:
9. Analyser NØYE om issuen tilhører backend, frontend, eller begge:
   - **backend**: API bugs, database issues, business logic, integrasjoner, performance på server
   - **frontend**: UI bugs, layout issues, form validation, navigation, UX problemer, client-side logic
   - **begge**: Features som krever både API OG UI, authentication issues, end-to-end bugs, datamodell-endringer
10. Sett targetRepositories til ["backend"], ["frontend"], eller ["backend", "frontend"] basert på analysen
11. Hvis usikker, velg begge repositories
"""

        user_context = f"""Type: {type_label}
Tittel: {title}
Beskrivelse: {description}"""

        if answers:
            user_context += "\n\nOppfølgingssvar:\n"
            for q, a in answers.items():
                user_context += f"- {q}: {a}\n"

        try:
            ai_response = await self.ai_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_context}
                ],
                temperature=0.3,
            )

            # Parse JSON response
            analysis = json.loads(ai_response)

            return {
                "success": True,
                **analysis
            }

        except json.JSONDecodeError as e:
            logger.warning(f"JSON parsing error: {e}")
            logger.warning(f"AI response was: {ai_response if 'ai_response' in locals() else 'N/A'}")
            # Fallback response
            return {
                "success": True,
                "needsMoreInfo": False,
                "followUpQuestions": None,
                "improvedTitle": title,
                "improvedDescription": description,
                "detectedTypes": [feedback_type],
                "existingFeature": None,
                "suggestSplit": False,
                "targetRepositories": ["backend", "frontend"]  # Both if AI fails
            }

        except Exception as e:
            logger.error(f"Error analyzing feedback: {e}")
            # Fallback response
            return {
                "success": True,
                "needsMoreInfo": False,
                "followUpQuestions": None,
                "improvedTitle": title,
                "improvedDescription": description,
                "detectedTypes": [feedback_type],
                "existingFeature": None,
                "suggestSplit": False,
                "targetRepositories": ["backend", "frontend"]  # Both if AI fails
            }


# Singleton
_feedback_ai_service = None

def get_feedback_ai_service() -> FeedbackAIService:
    """Get or create feedback AI service singleton."""
    global _feedback_ai_service
    if _feedback_ai_service is None:
        _feedback_ai_service = FeedbackAIService()
    return _feedback_ai_service
