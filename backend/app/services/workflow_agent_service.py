"""Workflow Agent Service for AI-driven task execution.

This service orchestrates the AI workflow copilot, handling:
- Natural language prompt interpretation
- Tool selection via function calling
- Multi-step workflow execution
- Confirmation flows for destructive operations
"""
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai_client import get_default_ai_client, ChatCompletionResult, ToolCall
from app.services.tool_registry import get_tool_registry, Tool, SafetyLevel
from app.schemas.workflow import (
    ActionLink,
    ChatMessage,
    WorkflowStep,
    ConfirmationRequest,
    WorkflowChatResponse,
)

logger = logging.getLogger(__name__)

# System prompt for the workflow agent
SYSTEM_PROMPT = """Du er en AI-assistent for Larvik Kommune Catering (LKC) systemet.
Din oppgave er å hjelpe brukere med å utføre oppgaver ved å kalle de riktige verktøyene.

VIKTIGE REGLER:
1. Bruk ALLTID verktøyene som er tilgjengelige for deg. Ikke prøv å svare uten å bruke verktøy.
2. For spørsmål som krever data fra systemet (ordrer, kunder, produkter, statistikk), bruk passende søke-verktøy.
3. Før du oppretter, endrer eller sletter noe, sørg for at du har all nødvendig informasjon.
4. Hvis du trenger å finne en kunde eller produkt først, bruk søkeverktøy før du utfører handlingen.
5. Vær presis med datoer - bruk formatet YYYY-MM-DD.
6. Svar alltid på norsk.
7. Når brukeren ber om å "finne meny [nummer]" eller "vis meny [nummer]", bruk get_menu med menyid=[nummer].
8. Når brukeren ber om å "finne oppskrift [nummer]" eller "vis oppskrift [nummer]", bruk get_recipe med oppskriftid=[nummer].

EKSEMPLER PÅ OPPGAVER:
- "Hvor mange ordrer har vi i dag?" → Bruk get_todays_orders eller search_orders
- "Finn kunde Larvik Sykehjem" → Bruk search_customers
- "List alle kundegrupper" → Bruk list_customer_groups
- "Vis kunder i kundegruppe sykehjem" → Bruk search_customers med kundegruppe="sykehjem"
- "Opprett ordre for kunde 42" → Bruk create_order (krever bekreftelse)
- "Vis statistikk for denne måneden" → Bruk get_quick_stats med period="month"
- "Finn meny 50" → Bruk get_menu med menyid=50
- "Vis oppskrift 123" → Bruk get_recipe med oppskriftid=123

WORKFLOW AUTOMATION (PLANLAGTE ARBEIDSFLYTER):
Når brukeren ber om å AUTOMATISERE noe eller PLANLEGGE regelmessige oppgaver, bruk create_workflow_full.

Gjenkjenn disse mønstrene:
- "Send e-post hver [dag/uke/måned]" → Automatisert e-post
- "Påminn kunder om [noe] hver [periode]" → Planlagt påminnelse
- "Sjekk [noe] daglig/ukentlig" → Automatisk sjekk
- "Automatiser [oppgave]" → Workflow automation

Cron-uttrykk hjelp (minutt time dag måned ukedag):
- "0 8 * * 1" = Hver mandag kl 08:00
- "0 6 * * *" = Daglig kl 06:00
- "0 18 * * 5" = Hver fredag kl 18:00
- "*/30 * * * *" = Hvert 30. minutt
- "0 9 * * 1-5" = Hverdager kl 09:00

Step types:
- send_email: Send e-post til kunder
- check_condition: Sjekk en betingelse (f.eks. manglende ordrer, lavt lager)
- wait_until: Vent til en betingelse er oppfylt
- create_order: Opprett en ordre automatisk

Recipients for e-post:
- "all_active_customers": Alle aktive kunder
- "specific_customers": Spesifikke kunder (krever kunde-IDer)
- "customers_by_group": Kunder i en gruppe (f.eks. sykehjem)

Eksempel workflow:
Bruker: "Send påminnelse til alle kunder hver mandag kl 08:00"
→ Bruk create_workflow_full med:
  - name: "Ukentlig påminnelse til kunder"
  - description: "Sender automatisk påminnelse om bestilling hver mandag morgen"
  - workflow_type: "scheduled"
  - steps: [{"step_type": "send_email", "step_name": "Send påminnelse", "step_order": 1, "action_config": {"recipients": "all_active_customers", "subject": "Husk å bestille mat", "body_text": "..."}}]
  - schedule: {"trigger_type": "time_based", "schedule_config": {"cron_expression": "0 8 * * 1"}}

For å SE workflows: Bruk list_workflows
For å KJØRE workflow manuelt: Bruk execute_workflow
For å SLETTE workflow: Bruk delete_workflow

Når du trenger flere steg (f.eks. finn kunde, så opprett ordre), utfør dem i rekkefølge."""


# In-memory store for pending confirmations (use Redis in production)
_pending_workflows: Dict[str, Dict[str, Any]] = {}


class WorkflowAgentService:
    """Service for executing AI-driven workflows."""

    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.ai_client = get_default_ai_client()
        self.tool_registry = get_tool_registry()

    async def process_message(
        self,
        message: str,
        conversation_history: Optional[List[ChatMessage]] = None,
        confirmed_workflow_id: Optional[str] = None,
    ) -> WorkflowChatResponse:
        """Process a user message and execute workflow if needed.

        Args:
            message: The user's natural language message
            conversation_history: Previous messages in the conversation
            confirmed_workflow_id: If set, execute a previously pending workflow

        Returns:
            WorkflowChatResponse with results or confirmation request
        """
        # Handle workflow confirmation
        if confirmed_workflow_id:
            return await self._execute_confirmed_workflow(confirmed_workflow_id)

        # Build messages for AI
        messages = self._build_messages(message, conversation_history)

        # Get tools in OpenAI format
        tools = self.tool_registry.get_openai_tools()

        try:
            # Call AI with function calling
            result = await self.ai_client.chat_completion_with_tools(
                messages=messages,
                tools=tools,
                temperature=0.3,  # Lower temperature for more deterministic tool selection
                max_tokens=2000,
            )

            # If no tool calls, just return the AI response
            if not result.tool_calls:
                return WorkflowChatResponse(
                    success=True,
                    message=result.content or "Jeg forstår ikke helt hva du mener. Kan du omformulere?",
                )

            # Process tool calls
            return await self._process_tool_calls(result.tool_calls, messages)

        except Exception as e:
            logger.error(f"Error in workflow agent: {e}", exc_info=True)

            # Provide more helpful error messages
            error_message = "Beklager, det oppstod en feil."
            if "API" in str(e) or "api" in str(e).lower():
                error_message = "Kunne ikke koble til AI-tjenesten. Sjekk API-nøkkel og tilkobling."
            elif "timeout" in str(e).lower():
                error_message = "Forespørselen tok for lang tid. Prøv igjen."
            elif "not found" in str(e).lower():
                error_message = f"Kunne ikke finne: {str(e)}"
            else:
                error_message = f"En feil oppstod: {str(e)}"

            return WorkflowChatResponse(
                success=False,
                message=error_message,
                error=str(e),
            )

    def _build_messages(
        self,
        message: str,
        conversation_history: Optional[List[ChatMessage]] = None
    ) -> List[Dict[str, Any]]:
        """Build messages list for AI including system prompt and history."""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history (limit to last 10 messages)
        if conversation_history:
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })

        # Add current message
        messages.append({"role": "user", "content": message})

        return messages

    async def _process_tool_calls(
        self,
        tool_calls: List[ToolCall],
        messages: List[Dict[str, Any]]
    ) -> WorkflowChatResponse:
        """Process tool calls from the AI response.

        If any tool requires confirmation, return a confirmation request.
        Otherwise, execute all tools and return results.
        """
        # Build workflow steps
        steps: List[WorkflowStep] = []
        requires_confirmation = False
        max_safety_level = SafetyLevel.READ

        for tc in tool_calls:
            tool = self.tool_registry.get_tool(tc.name)
            if not tool:
                logger.warning(f"Unknown tool requested: {tc.name}")
                continue

            step = WorkflowStep(
                tool_name=tc.name,
                tool_description=tool.description,
                parameters=tc.arguments,
                status="pending",
            )
            steps.append(step)

            # Check if confirmation is needed
            if tool.requires_confirmation:
                requires_confirmation = True
            if tool.safety_level.value > max_safety_level.value:
                max_safety_level = tool.safety_level

        if not steps:
            return WorkflowChatResponse(
                success=False,
                message="Kunne ikke forstå hvilke handlinger som skal utføres.",
            )

        # If confirmation needed, store workflow and return confirmation request
        if requires_confirmation:
            workflow_id = str(uuid.uuid4())
            _pending_workflows[workflow_id] = {
                "steps": steps,
                "messages": messages,
                "user_id": self.user_id,
                "created_at": datetime.utcnow(),
            }

            # Build confirmation summary
            summary = self._build_confirmation_summary(steps)
            details = [f"• {s.tool_description}: {s.parameters}" for s in steps]

            return WorkflowChatResponse(
                success=True,
                message="Følgende handlinger vil utføres:",
                requires_confirmation=True,
                confirmation_request=ConfirmationRequest(
                    workflow_id=workflow_id,
                    summary=summary,
                    details=details,
                    safety_level=max_safety_level.value,
                    steps=steps,
                ),
            )

        # No confirmation needed - execute immediately
        return await self._execute_steps(steps)

    def _build_confirmation_summary(self, steps: List[WorkflowStep]) -> str:
        """Build a human-readable summary for confirmation."""
        if len(steps) == 1:
            step = steps[0]
            return f"{step.tool_description}"
        return f"{len(steps)} handlinger vil utføres"

    async def _execute_confirmed_workflow(
        self,
        workflow_id: str
    ) -> WorkflowChatResponse:
        """Execute a previously confirmed workflow."""
        workflow = _pending_workflows.pop(workflow_id, None)
        if not workflow:
            return WorkflowChatResponse(
                success=False,
                message="Arbeidsflyten ble ikke funnet eller har utløpt.",
            )

        # Verify user
        if workflow["user_id"] != self.user_id:
            return WorkflowChatResponse(
                success=False,
                message="Du har ikke tilgang til denne arbeidsflyten.",
            )

        return await self._execute_steps(workflow["steps"])

    async def _execute_steps(
        self,
        steps: List[WorkflowStep]
    ) -> WorkflowChatResponse:
        """Execute workflow steps and return results."""
        from app.services.tool_executor import ToolExecutor
        import json

        executor = ToolExecutor(self.db)
        executed_steps: List[WorkflowStep] = []
        results = []
        all_action_links: List[ActionLink] = []

        for step in steps:
            step.status = "executing"
            try:
                result = await executor.execute(step.tool_name, step.parameters)

                # Extract action links from result
                action_links_data = result.pop("_action_links", [])
                step.action_links = [
                    ActionLink(**link) for link in action_links_data
                ]
                all_action_links.extend(step.action_links)

                step.result = result
                step.status = "completed"
                step.executed_at = datetime.utcnow()
                results.append(result)
            except Exception as e:
                step.status = "failed"
                step.error = str(e)
                logger.error(f"Tool execution failed: {step.tool_name} - {e}")

            executed_steps.append(step)

        # Build response message
        success = all(s.status == "completed" for s in executed_steps)
        message = self._build_result_message(executed_steps, results)

        # Generate AI analysis of results
        ai_analysis = None
        if success and results:
            ai_analysis = await self._generate_ai_analysis(executed_steps, results)

        return WorkflowChatResponse(
            success=success,
            message=message,
            executed_steps=executed_steps,
            action_links=all_action_links if all_action_links else None,
            ai_analysis=ai_analysis,
        )

    def _build_result_message(
        self,
        steps: List[WorkflowStep],
        results: List[Any]
    ) -> str:
        """Build a human-readable result message."""
        if not steps:
            return "Ingen handlinger ble utført."

        failed = [s for s in steps if s.status == "failed"]
        if failed:
            return f"Noen handlinger feilet: {', '.join(s.tool_name for s in failed)}"

        # For single read operations, format the result nicely
        if len(steps) == 1 and results:
            result = results[0]
            tool = self.tool_registry.get_tool(steps[0].tool_name)

            # Use response template if available
            if tool and tool.response_template and isinstance(result, dict):
                try:
                    return tool.response_template.format(**result)
                except KeyError:
                    pass

            # Format based on result type
            if isinstance(result, dict):
                if "items" in result and "total" in result:
                    return f"Fant {result['total']} resultater."
                if "total_revenue" in result:
                    return f"Omsetning: {result['total_revenue']:,.0f} kr, Ordrer: {result.get('total_orders', 0)}, Aktive kunder: {result.get('active_customers', 0)}"

            if isinstance(result, list):
                return f"Fant {len(result)} resultater."

        return f"Utførte {len(steps)} handling(er) vellykket."

    async def _generate_ai_analysis(
        self,
        steps: List[WorkflowStep],
        results: List[Any]
    ) -> Optional[str]:
        """Generate AI analysis of the results."""
        import json

        # Skip analysis for very small results
        if not results:
            return None

        # Prepare a summary of results for AI
        result_summary = []
        for i, (step, result) in enumerate(zip(steps, results)):
            summary = {
                "verktøy": step.tool_name,
                "beskrivelse": step.tool_description,
            }

            # Summarize result based on type
            if isinstance(result, dict):
                if "items" in result and "total" in result:
                    summary["antall_resultater"] = result["total"]
                    # Include first few items for context
                    items = result.get("items", [])[:5]
                    if items:
                        summary["eksempler"] = items
                else:
                    summary["resultat"] = result
            elif isinstance(result, list):
                summary["antall_resultater"] = len(result)
                if result:
                    summary["eksempler"] = result[:5]

            result_summary.append(summary)

        # Create prompt for AI analysis
        analysis_prompt = f"""Analyser følgende resultater fra LKC-systemet og gi en kort, nyttig oppsummering på norsk.
Fokuser på:
- Hva betyr dette for brukeren?
- Er det noe interessant eller viktig å bemerke?
- Gi konkrete tall når relevant

Resultater:
{json.dumps(result_summary, ensure_ascii=False, indent=2)}

Svar kort og konsist (2-4 setninger). Ikke gjenta hva jeg allerede har sagt."""

        try:
            analysis = await self.ai_client.chat_completion(
                messages=[
                    {"role": "system", "content": "Du er en hjelpsom assistent som analyserer data fra et catering-system."},
                    {"role": "user", "content": analysis_prompt}
                ],
                max_tokens=300,
                temperature=0.5,
            )
            return analysis.strip() if analysis else None
        except Exception as e:
            logger.warning(f"Failed to generate AI analysis: {e}")
            return None


# Singleton helper
def get_workflow_agent_service(db: AsyncSession, user_id: int) -> WorkflowAgentService:
    """Create a workflow agent service instance."""
    return WorkflowAgentService(db, user_id)
