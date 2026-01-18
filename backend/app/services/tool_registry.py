"""Tool Registry for AI Workflow Agent.

Defines available tools (API operations) that the AI agent can use.
Each tool maps to an internal API endpoint and includes metadata
for safety classification and parameter validation.
"""
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class SafetyLevel(str, Enum):
    """Safety classification for tools."""
    READ = "read"       # No confirmation needed
    WRITE = "write"     # Confirmation for new data
    UPDATE = "update"   # Confirmation showing before/after
    DELETE = "delete"   # Strong confirmation required


class ToolParameter(BaseModel):
    """Parameter definition for a tool."""
    name: str
    type: str  # string, integer, number, boolean, array
    description: str
    required: bool = False
    default: Optional[Any] = None
    enum: Optional[List[str]] = None


class Tool(BaseModel):
    """Tool definition for the AI agent."""
    name: str
    description: str
    category: str
    endpoint: str
    method: str  # GET, POST, PUT, DELETE, PATCH
    parameters: List[ToolParameter]
    safety_level: SafetyLevel
    requires_confirmation: bool = False
    response_template: Optional[str] = None  # How to format response


# Core tools for LKC system
TOOLS: List[Tool] = [
    # =========================================================================
    # KUNDER (Customers)
    # =========================================================================
    Tool(
        name="search_customers",
        description="Søk etter kunder. Kan filtrere på navn/e-post/telefon OG/ELLER kundegruppe (f.eks. sykehjem, barnehage).",
        category="kunder",
        endpoint="/kunder",
        method="GET",
        parameters=[
            ToolParameter(name="search", type="string", description="Søkeord (navn, e-post eller telefon)"),
            ToolParameter(name="kundegruppe", type="string", description="Filtrer på kundegruppe-navn (f.eks. 'sykehjem', 'barnehage', 'skole')"),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=50),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="list_customer_groups",
        description="List alle kundegrupper i systemet (f.eks. sykehjem, barnehage, skole, etc.).",
        category="kunder",
        endpoint="/kunde-gruppe",
        method="GET",
        parameters=[
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=50),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="get_customer",
        description="Hent detaljert informasjon om en spesifikk kunde basert på kunde-ID.",
        category="kunder",
        endpoint="/kunder/{kundeid}",
        method="GET",
        parameters=[
            ToolParameter(name="kundeid", type="integer", description="Kunde-ID", required=True),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="create_customer",
        description="Opprett en ny kunde i systemet.",
        category="kunder",
        endpoint="/kunder",
        method="POST",
        parameters=[
            ToolParameter(name="kundenavn", type="string", description="Kundens navn", required=True),
            ToolParameter(name="epost", type="string", description="E-postadresse"),
            ToolParameter(name="telefon", type="string", description="Telefonnummer"),
            ToolParameter(name="adresse", type="string", description="Adresse"),
            ToolParameter(name="postnr", type="string", description="Postnummer"),
            ToolParameter(name="poststed", type="string", description="Poststed"),
        ],
        safety_level=SafetyLevel.WRITE,
        requires_confirmation=True,
    ),

    # =========================================================================
    # ORDRER (Orders)
    # =========================================================================
    Tool(
        name="search_orders",
        description="Søk etter ordrer. Kan filtrere på kunde, dato og status.",
        category="ordrer",
        endpoint="/ordrer",
        method="GET",
        parameters=[
            ToolParameter(name="search", type="string", description="Søkeord (kundenavn eller ordrenummer)"),
            ToolParameter(name="kundeid", type="integer", description="Filtrer på kunde-ID"),
            ToolParameter(name="fra_dato", type="string", description="Fra dato (YYYY-MM-DD)"),
            ToolParameter(name="til_dato", type="string", description="Til dato (YYYY-MM-DD)"),
            ToolParameter(name="ordrestatusid", type="integer", description="Filtrer på status"),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=20),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="get_order",
        description="Hent detaljert informasjon om en spesifikk ordre inkludert ordrelinjer.",
        category="ordrer",
        endpoint="/ordrer/{ordreid}",
        method="GET",
        parameters=[
            ToolParameter(name="ordreid", type="integer", description="Ordre-ID", required=True),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="get_todays_orders",
        description="Hent alle ordrer for levering i dag.",
        category="ordrer",
        endpoint="/ordrer",
        method="GET",
        parameters=[
            ToolParameter(name="leveringsdato", type="string", description="Dagens dato", default="today"),
        ],
        safety_level=SafetyLevel.READ,
        response_template="Du har {total} ordrer for levering i dag.",
    ),
    Tool(
        name="create_order",
        description="Opprett en ny ordre for en kunde.",
        category="ordrer",
        endpoint="/ordrer",
        method="POST",
        parameters=[
            ToolParameter(name="kundeid", type="integer", description="Kunde-ID", required=True),
            ToolParameter(name="leveringsdato", type="string", description="Leveringsdato (YYYY-MM-DD)", required=True),
            ToolParameter(name="informasjon", type="string", description="Ekstra informasjon/kommentar"),
        ],
        safety_level=SafetyLevel.WRITE,
        requires_confirmation=True,
    ),
    Tool(
        name="add_order_line",
        description="Legg til en produktlinje på en ordre.",
        category="ordrer",
        endpoint="/ordrer/{ordreid}/detaljer",
        method="POST",
        parameters=[
            ToolParameter(name="ordreid", type="integer", description="Ordre-ID", required=True),
            ToolParameter(name="produktid", type="integer", description="Produkt-ID", required=True),
            ToolParameter(name="antall", type="integer", description="Antall", required=True),
        ],
        safety_level=SafetyLevel.WRITE,
        requires_confirmation=True,
    ),
    Tool(
        name="update_order_status",
        description="Oppdater status på en ordre.",
        category="ordrer",
        endpoint="/ordrer/{ordreid}/status",
        method="PATCH",
        parameters=[
            ToolParameter(name="ordreid", type="integer", description="Ordre-ID", required=True),
            ToolParameter(name="ordrestatusid", type="integer", description="Ny status-ID", required=True),
        ],
        safety_level=SafetyLevel.UPDATE,
        requires_confirmation=True,
    ),
    Tool(
        name="cancel_order",
        description="Kanseller en ordre.",
        category="ordrer",
        endpoint="/ordrer/{ordreid}/kanseller",
        method="POST",
        parameters=[
            ToolParameter(name="ordreid", type="integer", description="Ordre-ID", required=True),
            ToolParameter(name="arsak", type="string", description="Årsak til kansellering"),
        ],
        safety_level=SafetyLevel.DELETE,
        requires_confirmation=True,
    ),

    # =========================================================================
    # PRODUKTER (Products)
    # =========================================================================
    Tool(
        name="search_products",
        description="Søk etter produkter basert på navn eller EAN-kode.",
        category="produkter",
        endpoint="/produkter",
        method="GET",
        parameters=[
            ToolParameter(name="search", type="string", description="Søkeord (produktnavn eller EAN)", required=True),
            ToolParameter(name="kategoriid", type="integer", description="Filtrer på kategori"),
            ToolParameter(name="webshop", type="boolean", description="Kun webshop-produkter"),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=20),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="get_product",
        description="Hent detaljert informasjon om et produkt.",
        category="produkter",
        endpoint="/produkter/{produktid}",
        method="GET",
        parameters=[
            ToolParameter(name="produktid", type="integer", description="Produkt-ID", required=True),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="update_product_price",
        description="Oppdater prisen på et produkt.",
        category="produkter",
        endpoint="/produkter/{produktid}",
        method="PUT",
        parameters=[
            ToolParameter(name="produktid", type="integer", description="Produkt-ID", required=True),
            ToolParameter(name="pris", type="number", description="Ny pris", required=True),
        ],
        safety_level=SafetyLevel.UPDATE,
        requires_confirmation=True,
    ),

    # =========================================================================
    # KATEGORIER (Categories)
    # =========================================================================
    Tool(
        name="list_categories",
        description="List alle produktkategorier.",
        category="kategorier",
        endpoint="/kategorier",
        method="GET",
        parameters=[
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=100),
        ],
        safety_level=SafetyLevel.READ,
    ),

    # =========================================================================
    # MENYER (Menus)
    # =========================================================================
    Tool(
        name="list_menus",
        description="List alle menyer.",
        category="meny",
        endpoint="/meny",
        method="GET",
        parameters=[
            ToolParameter(name="search", type="string", description="Søkeord"),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=50),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="get_menu",
        description="Hent detaljert informasjon om en meny inkludert produkter.",
        category="meny",
        endpoint="/meny/{menyid}",
        method="GET",
        parameters=[
            ToolParameter(name="menyid", type="integer", description="Meny-ID", required=True),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="add_product_to_menu",
        description="Legg til et produkt på en meny.",
        category="meny",
        endpoint="/meny-produkt",
        method="POST",
        parameters=[
            ToolParameter(name="menyid", type="integer", description="Meny-ID", required=True),
            ToolParameter(name="produktid", type="integer", description="Produkt-ID", required=True),
            ToolParameter(name="antall", type="integer", description="Standard antall", default=1),
        ],
        safety_level=SafetyLevel.WRITE,
        requires_confirmation=True,
    ),

    # =========================================================================
    # OPPSKRIFTER (Recipes)
    # =========================================================================
    Tool(
        name="search_recipes",
        description="Søk etter oppskrifter.",
        category="oppskrifter",
        endpoint="/oppskrifter",
        method="GET",
        parameters=[
            ToolParameter(name="search", type="string", description="Søkeord"),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=20),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="get_recipe",
        description="Hent detaljert oppskrift med ingredienser og fremgangsmåte.",
        category="oppskrifter",
        endpoint="/oppskrifter/{oppskriftid}",
        method="GET",
        parameters=[
            ToolParameter(name="oppskriftid", type="integer", description="Oppskrift-ID", required=True),
        ],
        safety_level=SafetyLevel.READ,
    ),

    # =========================================================================
    # STATISTIKK OG RAPPORTER (Statistics & Reports)
    # =========================================================================
    Tool(
        name="get_quick_stats",
        description="Hent hurtigstatistikk (omsetning, antall ordrer, aktive kunder) for en periode.",
        category="statistikk",
        endpoint="graphql:quick_stats",
        method="GRAPHQL",
        parameters=[
            ToolParameter(
                name="period",
                type="string",
                description="Periode (today, week, month, quarter, year)",
                required=True,
                enum=["today", "week", "month", "quarter", "year"]
            ),
        ],
        safety_level=SafetyLevel.READ,
        response_template="Statistikk for {period}: Omsetning: {total_revenue} kr, Ordrer: {total_orders}, Aktive kunder: {active_customers}",
    ),
    Tool(
        name="get_sales_report",
        description="Generer salgsrapport for en periode.",
        category="statistikk",
        endpoint="graphql:sales_report",
        method="GRAPHQL",
        parameters=[
            ToolParameter(name="period", type="string", description="Periode (week, month, quarter, year)", required=True),
            ToolParameter(name="start_date", type="string", description="Startdato (YYYY-MM-DD)"),
            ToolParameter(name="end_date", type="string", description="Sluttdato (YYYY-MM-DD)"),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="generate_ai_report",
        description="Generer en AI-analysert rapport med innsikt og anbefalinger.",
        category="statistikk",
        endpoint="graphql:generate_ai_report",
        method="GRAPHQL",
        parameters=[
            ToolParameter(name="period", type="string", description="Periode", required=True),
            ToolParameter(name="report_type", type="string", description="Rapporttype (salg, produkter, kunder)", default="salg"),
            ToolParameter(name="custom_prompt", type="string", description="Tilpasset instruksjon for rapporten"),
        ],
        safety_level=SafetyLevel.READ,
    ),

    # =========================================================================
    # LEVERANDØRER (Suppliers)
    # =========================================================================
    Tool(
        name="list_suppliers",
        description="List alle leverandører.",
        category="leverandorer",
        endpoint="/leverandorer",
        method="GET",
        parameters=[
            ToolParameter(name="search", type="string", description="Søkeord"),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=50),
        ],
        safety_level=SafetyLevel.READ,
    ),

    # =========================================================================
    # WORKFLOW AUTOMATION
    # =========================================================================
    Tool(
        name="create_workflow",
        description="Opprett en ny automatisert arbeidsflyt (workflow). Bruk dette når brukeren vil automatisere en oppgave.",
        category="workflow-automation",
        endpoint="/workflow-automation/workflows",
        method="POST",
        parameters=[
            ToolParameter(name="name", type="string", description="Navn på arbeidsflyten", required=True),
            ToolParameter(name="description", type="string", description="Beskrivelse av hva arbeidsflyten gjør"),
            ToolParameter(name="is_active", type="boolean", description="Om arbeidsflyten skal være aktiv", default=True),
            ToolParameter(name="workflow_type", type="string", description="Type arbeidsflyt", enum=["scheduled", "event_based"], default="scheduled"),
        ],
        safety_level=SafetyLevel.WRITE,
        requires_confirmation=True,
        response_template="Arbeidsflyt '{name}' opprettet med ID {id}. Status: {'aktiv' if is_active else 'inaktiv'}",
    ),
    Tool(
        name="list_workflows",
        description="List alle automatiserte arbeidsflyter. Kan filtrere på aktiv/inaktiv status.",
        category="workflow-automation",
        endpoint="/workflow-automation/workflows",
        method="GET",
        parameters=[
            ToolParameter(name="is_active", type="boolean", description="Filtrer på aktiv status"),
            ToolParameter(name="workflow_type", type="string", description="Filtrer på type", enum=["scheduled", "event_based"]),
            ToolParameter(name="search", type="string", description="Søkeord i navn eller beskrivelse"),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=50),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="get_workflow",
        description="Hent detaljert informasjon om en spesifikk arbeidsflyt med alle steg og kjøreplan.",
        category="workflow-automation",
        endpoint="/workflow-automation/workflows/{workflow_id}",
        method="GET",
        parameters=[
            ToolParameter(name="workflow_id", type="integer", description="Arbeidsflyt-ID", required=True),
            ToolParameter(name="include_steps", type="boolean", description="Inkluder alle steg", default=True),
            ToolParameter(name="include_schedule", type="boolean", description="Inkluder kjøreplan", default=True),
            ToolParameter(name="include_executions", type="boolean", description="Inkluder kjøringshistorikk", default=False),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="execute_workflow",
        description="Kjør en arbeidsflyt manuelt nå (i stedet for å vente på planlagt tid).",
        category="workflow-automation",
        endpoint="/workflow-automation/workflows/{workflow_id}/execute",
        method="POST",
        parameters=[
            ToolParameter(name="workflow_id", type="integer", description="Arbeidsflyt-ID", required=True),
        ],
        safety_level=SafetyLevel.WRITE,
        requires_confirmation=True,
        response_template="Startet kjøring av arbeidsflyt med execution ID {id}",
    ),
    Tool(
        name="get_workflow_statistics",
        description="Hent statistikk for en arbeidsflyt (antall kjøringer, suksessrate, gjennomsnittlig varighet).",
        category="workflow-automation",
        endpoint="/workflow-automation/workflows/{workflow_id}/statistics",
        method="GET",
        parameters=[
            ToolParameter(name="workflow_id", type="integer", description="Arbeidsflyt-ID", required=True),
        ],
        safety_level=SafetyLevel.READ,
        response_template="Statistikk for arbeidsflyt: {total_executions} kjøringer, {success_rate:.1%} suksessrate",
    ),
    Tool(
        name="list_workflow_executions",
        description="List alle kjøringer av arbeidsflyter. Kan filtrere på arbeidsflyt og status.",
        category="workflow-automation",
        endpoint="/workflow-automation/executions",
        method="GET",
        parameters=[
            ToolParameter(name="workflow_id", type="integer", description="Filtrer på arbeidsflyt-ID"),
            ToolParameter(name="status", type="string", description="Filtrer på status", enum=["running", "completed", "failed", "paused"]),
            ToolParameter(name="page_size", type="integer", description="Antall resultater", default=50),
        ],
        safety_level=SafetyLevel.READ,
    ),
    Tool(
        name="update_workflow",
        description="Oppdater en eksisterende arbeidsflyt (navn, beskrivelse, aktiv status).",
        category="workflow-automation",
        endpoint="/workflow-automation/workflows/{workflow_id}",
        method="PATCH",
        parameters=[
            ToolParameter(name="workflow_id", type="integer", description="Arbeidsflyt-ID", required=True),
            ToolParameter(name="name", type="string", description="Nytt navn"),
            ToolParameter(name="description", type="string", description="Ny beskrivelse"),
            ToolParameter(name="is_active", type="boolean", description="Aktiv status"),
        ],
        safety_level=SafetyLevel.UPDATE,
        requires_confirmation=True,
    ),
    Tool(
        name="delete_workflow",
        description="Slett en arbeidsflyt permanent. Dette sletter også alle steg, kjøreplaner og kjøringshistorikk.",
        category="workflow-automation",
        endpoint="/workflow-automation/workflows/{workflow_id}",
        method="DELETE",
        parameters=[
            ToolParameter(name="workflow_id", type="integer", description="Arbeidsflyt-ID", required=True),
        ],
        safety_level=SafetyLevel.DELETE,
        requires_confirmation=True,
    ),
]


class ToolRegistry:
    """Registry for managing tools available to the AI agent."""

    def __init__(self):
        self._tools: Dict[str, Tool] = {tool.name: tool for tool in TOOLS}

    def get_tool(self, name: str) -> Optional[Tool]:
        """Get a tool by name."""
        return self._tools.get(name)

    def get_all_tools(self) -> List[Tool]:
        """Get all registered tools."""
        return list(self._tools.values())

    def get_tools_by_category(self, category: str) -> List[Tool]:
        """Get tools filtered by category."""
        return [t for t in self._tools.values() if t.category == category]

    def get_openai_tools(self) -> List[Dict[str, Any]]:
        """Get tools in OpenAI function calling format."""
        openai_tools = []
        for tool in self._tools.values():
            # Build parameters schema
            properties = {}
            required = []
            for param in tool.parameters:
                prop = {
                    "type": param.type,
                    "description": param.description
                }
                if param.enum:
                    prop["enum"] = param.enum
                if param.default is not None:
                    prop["default"] = param.default
                properties[param.name] = prop
                if param.required:
                    required.append(param.name)

            openai_tools.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required
                    }
                }
            })
        return openai_tools

    def get_tool_categories(self) -> List[str]:
        """Get list of unique tool categories."""
        return list(set(t.category for t in self._tools.values()))


# Singleton instance
_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get the tool registry singleton."""
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
    return _registry
