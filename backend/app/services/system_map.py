"""System map describing what functionality exists in which repository."""

SYSTEM_MAP = {
    "backend": {
        "repo": "isyvertsen/LKCserver-backend",
        "description": "FastAPI backend - REST API, database, business logic",
        "technologies": [
            "Python 3.11+",
            "FastAPI",
            "SQLAlchemy (async)",
            "PostgreSQL",
            "Redis",
            "OpenAI API",
            "httpx"
        ],
        "features": [
            # API Endpoints
            "REST API endpoints (/api/v1/*)",
            "API authentication og JWT tokens",
            "API rate limiting",

            # Data og Database
            "Database models og migrations",
            "PostgreSQL database schema",
            "Produktkatalog (tblprodukter)",
            "Matinfo produkter (matinfo_products) - read-only",
            "EAN-kode håndtering",

            # Business Logic
            "Oppskriftslogikk og beregninger",
            "Næringsberegning fra Matinfo.no",
            "Ordrebehandling og ordre-status",
            "Menyplanlegging logikk",
            "Kundegruppe-håndtering",

            # Integrasjoner
            "Matinfo.no API integrasjon",
            "OpenAI GPT-4 integrasjon (rettenavn, instruksjoner)",
            "ReportBro PDF-generering",
            "GitHub API integrasjon (feedback system)",

            # Services
            "AI-generering av rettenavn",
            "AI-forbedring av tilberedningsinstruksjoner",
            "Feedback AI-analyse",
            "GitHub issue opprettelse",
            "Produkt-sync fra eksterne kilder (NGData, Vetduat)",

            # Data Processing
            "CSV/Excel import/export",
            "Data validering og sanitering",
            "Batch processing",
        ],
        "files_and_paths": {
            "api_endpoints": "app/api/v1/",
            "models": "app/models/",
            "services": "app/services/",
            "schemas": "app/schemas/",
            "core": "app/core/",
            "config": "app/core/config.py",
            "database": "app/infrastructure/database/",
            "migrations": "app/core/migrations.py"
        }
    },
    "frontend": {
        "repo": "isyvertsen/LKCserver-frontend",
        "description": "Next.js 15 frontend - UI, forms, user interaction",
        "technologies": [
            "Next.js 15 (App Router)",
            "React 19",
            "TypeScript",
            "Tailwind CSS",
            "shadcn/ui",
            "React Query",
            "NextAuth v5",
            "Playwright (E2E testing)"
        ],
        "features": [
            # UI Components
            "shadcn/ui komponenter (dialog, button, input, etc.)",
            "Allergen-komponenter (AllergenBadge, AllergenList)",
            "Data table komponent med pagination og sorting",
            "Form-komponenter med validering",
            "Toast notifications (sonner)",
            "Error boundaries",

            # Pages og Views
            "Dashboard med statistikk",
            "Oppskrifts-administrasjon UI",
            "Produkt-administrasjon UI",
            "Ordre-oversikt og ordrehåndtering UI",
            "Meny-planlegging UI",
            "Kunde-administrasjon UI",
            "Ansatt-administrasjon UI",
            "Rapporter UI",
            "Innstillinger UI",
            "Etikettdesigner UI",
            "EAN-kodestyring UI",

            # Layout og Navigation
            "Sidebar navigasjon",
            "Top navigation",
            "Mobile menu",
            "Collapsible sidebar",

            # Forms og Input
            "Oppskrift-skjema",
            "Produkt-skjema",
            "Ordre-skjema",
            "Kunde-skjema",
            "Ansatt-skjema",
            "Form validering med Zod",

            # Authentication
            "Login-side",
            "Google OAuth login",
            "Session management (NextAuth)",
            "Token refresh",

            # Features
            "Feedback dialog (rapporter problem)",
            "PDF label preview",
            "Allergen filtering",
            "Search og filtering",
            "Sorting og pagination",

            # API Integration
            "API client (axios-basert)",
            "React Query hooks",
            "CRUD factories",
            "Error handling"
        ],
        "files_and_paths": {
            "pages": "src/app/",
            "components": "src/components/",
            "ui_components": "src/components/ui/",
            "api_client": "src/lib/api/",
            "hooks": "src/hooks/",
            "types": "src/types/",
            "utils": "src/lib/",
            "styles": "src/app/globals.css"
        }
    },
    "both": {
        "description": "Issues som påvirker både frontend og backend",
        "examples": [
            "Nye features som krever både API og UI",
            "Datamodell-endringer som påvirker både database og forms",
            "Authentication/authorization problemer",
            "End-to-end bugs som involverer både API og UI",
            "Performance problemer som krever optimalisering i begge lag"
        ]
    }
}


def get_system_context() -> str:
    """
    Get formatted system context for AI analysis.

    Returns a formatted string describing the system architecture
    that helps AI determine which repository an issue belongs to.
    """
    context = """# SYSTEM ARKITEKTUR

## Backend Repository: isyvertsen/LKCserver-backend
**Teknologier:** FastAPI, Python, PostgreSQL, SQLAlchemy, Redis, OpenAI API

**Ansvar:**
- REST API endpoints (/api/v1/*)
- Database models og business logic
- Databehandling og validering
- Eksterne integrasjoner (Matinfo.no, OpenAI, GitHub, ReportBro)
- AI-tjenester (rettenavn-generering, instruksjons-forbedring)
- Autentisering (JWT tokens)
- Data sync fra eksterne kilder

**Typiske backend-issues:**
- API endpoint feil (500 errors, 404, validation errors)
- Database problemer (migrations, constraints, performance)
- Business logic bugs (feil beregninger, feil data)
- Integrasjonsproblemer (Matinfo API, OpenAI API)
- Slow queries eller performance
- Authentication/authorization bugs

---

## Frontend Repository: isyvertsen/LKCserver-frontend
**Teknologier:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui

**Ansvar:**
- Brukergrensesnitt og komponenter
- Forms og input-validering (client-side)
- Navigasjon og routing
- UI state management
- Brukervennlighet og design
- Client-side error handling
- E2E testing (Playwright)

**Typiske frontend-issues:**
- UI bugs (feil layout, styling, responsiveness)
- Form validering problemer
- Navigation issues
- Component bugs (crashes, rendering issues)
- UX-problemer (forvirrende UI, manglende feedback)
- Browser-compatibility issues
- Mobile layout problemer

---

## Begge Repositories
Issues som påvirker BÅDE frontend og backend:
- Nye features som krever både API endpoint OG UI
- Datamodell-endringer (krever både database migration OG form updates)
- End-to-end bugs (starter i UI, feiler i API eller omvendt)
- Authentication/session bugs som påvirker både tokens og UI state
- Performance issues som krever optimalisering i begge lag
"""
    return context


def get_existing_features_by_repo() -> dict:
    """Get lists of existing features organized by repository."""
    return {
        "backend": [
            "Oppskriftsadministrasjon med næringsberegning fra Matinfo.no",
            "AI-generering av rettenavn (OpenAI GPT-4)",
            "AI-forbedring av tilberedningsinstruksjoner",
            "Ordrehåndtering med status-tracking",
            "Produktkatalog med EAN-kode integrasjon",
            "Matinfo.no sync for næringsdata",
            "Ansattadministrasjon med roller",
            "Rapportgenerering med ReportBro PDF-export",
            "Menyplanlegging med periode-basert system",
            "Leverandøradministrasjon",
            "Kundeadministrasjon med kundegrupper",
            "Statistikk API for dashboard",
            "EAN-kodestyring",
            "JWT authentication med token refresh",
            "GitHub feedback system (dette nye systemet)",
        ],
        "frontend": [
            "Dashboard med statistikk-kort og quick actions",
            "Oppskrifts-editor med ingrediens-håndtering",
            "Produkt-administrasjon med søk og filtering",
            "Ordre-oversikt med status og leveringsinfo",
            "Meny-planlegging UI med drag-and-drop",
            "Etikettdesigner for produktetiketter",
            "EAN-kodestyring UI",
            "Allergen-visualisering (badges og liste)",
            "Google OAuth login",
            "Sidebar navigasjon med collapse",
            "Mobile-vennlig responsive design",
            "Toast notifications for user feedback",
            "Feedback dialog (rapporter problem)",
            "Data tables med pagination, sorting, search",
        ],
        "both": [
            "Login/Authentication system (NextAuth + FastAPI JWT)",
            "CRUD operations for alle entiteter (API + UI forms)",
            "PDF label generation (ReportBro backend + preview frontend)",
        ]
    }
