"""Service for documentation chatbot with OpenAI integration."""
from typing import List, Dict, Any
import openai
from app.core.config import settings


# Documentation content (mirrored from frontend)
FRONTEND_DOCS = """# Frontend Dokumentasjon

## Oversikt
Dette er dokumentasjonssystemet for Larvik Catering frontend-applikasjonen.

## Arkitektur

### Teknologistakk
- **Next.js 15**: React-rammeverk med App Router
- **TypeScript**: Type-sikkerhet
- **NextAuth**: Autentisering
- **Tailwind CSS**: Styling
- **Radix UI**: UI-komponenter

### Prosjektstruktur
```
src/
├── app/              # Next.js app router sider
│   ├── admin/        # Admin-sider (krever admin-rettigheter)
│   ├── api/          # API-ruter (proxy til backend)
│   └── ...           # Andre sider
├── components/       # Gjenbrukbare komponenter
├── lib/              # Utility-funksjoner
└── auth.ts           # NextAuth-konfigurasjon
```

## Autentisering
Autentisering håndteres av NextAuth med to providers:
1. **Google OAuth**: For Google-kontoer
2. **Credentials**: For email/passord

Access tokens fornyes automatisk hver 30. minutt.

## API-integrasjon
All kommunikasjon med backend går gjennom `apiClient` (axios).

## Komponenter
Radix UI-baserte komponenter i `components/ui/`:
- Button, Dialog, Tabs, Card, etc.
- Tailwind CSS for styling

## Testing
- **Jest**: Unit tests
- **Playwright**: E2E tests
"""

BACKEND_DOCS = """# Backend API Dokumentasjon

## Oversikt
Backend er en FastAPI-applikasjon som håndterer all business logic og database-operasjoner.

## Autentisering

### Endpoints
- POST /api/auth/login - Login med email og passord
- POST /api/auth/google - Login med Google OAuth
- POST /api/auth/refresh - Forny access token

## Admin API

### Brukeradministrasjon
- GET /api/admin/users - Hent alle brukere (krever admin)
- PATCH /api/admin/users/{user_id}/activate - Aktiver bruker
- PATCH /api/admin/users/{user_id}/make-admin - Gi admin-rettigheter

## Feilhåndtering

### HTTP-statuskoder
- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
"""

API_DOCS = """# API-funksjonsbeskrivelser

## Ordre-håndtering

### Endpoints
- POST /api/orders - Opprett ny ordre
- GET /api/orders/{id} - Hent enkeltordre
- GET /api/orders - Hent alle ordrer med filtrering
  - Query params: customer_id, start_date, end_date, status

## Produktstyring
Produkter registreres med EAN-koder og kan søkes/filtreres.

## Oppskrifter
Oppskrifter inneholder ingredienser med beregnede næringsverdier.
- Næringsverdier beregnes automatisk fra ingrediensene
- Vises per 100g og per porsjon

## Etikett-design
1. Velg mal
2. Konfigurer felter
3. Koble til datakilde (produkter, oppskrifter, egendefinerte data)
4. Forhåndsvis
5. Skriv ut
"""


class DocumentationChatService:
    """Service for handling documentation chat with OpenAI."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = "gpt-4o"  # Using gpt-4o for faster responses

    def _get_system_prompt(self) -> str:
        """Build system prompt with documentation context."""
        return f"""Du er en hjelpsom dokumentasjonsassistent for Larvik Kommune Catering (LKC) systemet.
Svar alltid på norsk. Vær konsis og presis.

Bruk informasjonen under til å besvare brukerspørsmål om systemet.

--- FRONTEND DOKUMENTASJON ---
{FRONTEND_DOCS}

--- BACKEND DOKUMENTASJON ---
{BACKEND_DOCS}

--- API DOKUMENTASJON ---
{API_DOCS}

REGLER:
1. Svar kun basert på dokumentasjonen over
2. Hvis du ikke finner svaret i dokumentasjonen, si det ærlig
3. Formater svar med markdown for lesbarhet
4. Hold svar konsise men komplette
5. Gi konkrete eksempler når det er relevant
6. Hvis brukeren spør om noe utenfor systemets scope, forklar høflig at du kun kan hjelpe med LKC-systemet"""

    async def chat(
        self,
        message: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Process a chat message and return AI response.

        Args:
            message: User's message
            conversation_history: Previous messages in the conversation

        Returns:
            {
                "success": bool,
                "message": str,
                "error": Optional[str]
            }
        """
        if not self.api_key:
            return {
                "success": False,
                "message": "",
                "error": "AI er ikke konfigurert. Kontakt administrator."
            }

        # Build messages for OpenAI
        messages = [{"role": "system", "content": self._get_system_prompt()}]

        # Add conversation history (limit to last 10 messages to avoid token overflow)
        if conversation_history:
            messages.extend(conversation_history[-10:])

        # Add current user message
        messages.append({"role": "user", "content": message})

        try:
            client = openai.OpenAI(api_key=self.api_key)

            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,  # Low temperature for factual responses
                max_tokens=1000
            )

            ai_response = response.choices[0].message.content

            return {
                "success": True,
                "message": ai_response,
                "error": None
            }

        except openai.APIError as e:
            print(f"[Documentation Chat] OpenAI API error: {e}")
            return {
                "success": False,
                "message": "",
                "error": f"AI-tjenesten er midlertidig utilgjengelig. Prøv igjen senere."
            }

        except Exception as e:
            print(f"[Documentation Chat] Unexpected error: {e}")
            return {
                "success": False,
                "message": "",
                "error": "En uventet feil oppstod. Prøv igjen."
            }


# Singleton
_documentation_chat_service = None


def get_documentation_chat_service() -> DocumentationChatService:
    """Get or create documentation chat service singleton."""
    global _documentation_chat_service
    if _documentation_chat_service is None:
        _documentation_chat_service = DocumentationChatService()
    return _documentation_chat_service
