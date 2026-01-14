"""AI Workflow Copilot API endpoints.

Provides chat-based interface for executing workflows through natural language.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.schemas.workflow import (
    WorkflowChatRequest,
    WorkflowChatResponse,
    WorkflowConfirmRequest,
    WorkflowConfirmResponse,
)
from app.services.workflow_agent_service import get_workflow_agent_service
from app.services.tool_registry import get_tool_registry

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=WorkflowChatResponse)
async def workflow_chat(
    request: WorkflowChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowChatResponse:
    """Process a natural language message and execute workflow if needed.

    This endpoint:
    1. Takes a natural language message from the user
    2. Uses AI to determine which tools/actions to execute
    3. For read operations: executes immediately and returns results
    4. For write/delete operations: returns confirmation request

    Example messages:
    - "Hvor mange ordrer har vi i dag?" → Returns order count
    - "Finn kunde Larvik Sykehjem" → Returns customer list
    - "Opprett ordre for kunde 42" → Returns confirmation request
    """
    try:
        agent = get_workflow_agent_service(db, current_user.brukerid)
        response = await agent.process_message(
            message=request.message,
            conversation_history=request.conversation_history,
            confirmed_workflow_id=request.confirmed_workflow_id,
        )
        return response
    except Exception as e:
        logger.error(f"Workflow chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Feil ved behandling av melding: {str(e)}"
        )


@router.post("/confirm", response_model=WorkflowConfirmResponse)
async def confirm_workflow(
    request: WorkflowConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowConfirmResponse:
    """Confirm and execute a pending workflow.

    After receiving a confirmation request from /chat, use this endpoint
    to confirm and execute the workflow.
    """
    if not request.confirmed:
        return WorkflowConfirmResponse(
            success=True,
            message="Arbeidsflyten ble avbrutt.",
        )

    try:
        agent = get_workflow_agent_service(db, current_user.brukerid)
        response = await agent.process_message(
            message="",
            confirmed_workflow_id=request.workflow_id,
        )
        return WorkflowConfirmResponse(
            success=response.success,
            message=response.message,
            executed_steps=response.executed_steps,
            error=response.error,
        )
    except Exception as e:
        logger.error(f"Workflow confirm error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Feil ved bekreftelse: {str(e)}"
        )


@router.get("/tools")
async def list_available_tools(
    current_user: User = Depends(get_current_user),
):
    """List all available tools for the workflow agent.

    Returns the tools grouped by category with their descriptions.
    Useful for understanding what the AI can do.
    """
    registry = get_tool_registry()
    tools = registry.get_all_tools()

    # Group by category
    categories = {}
    for tool in tools:
        if tool.category not in categories:
            categories[tool.category] = []
        categories[tool.category].append({
            "name": tool.name,
            "description": tool.description,
            "safety_level": tool.safety_level.value,
            "requires_confirmation": tool.requires_confirmation,
        })

    return {
        "categories": categories,
        "total_tools": len(tools),
    }


@router.get("/tools/{tool_name}")
async def get_tool_details(
    tool_name: str,
    current_user: User = Depends(get_current_user),
):
    """Get detailed information about a specific tool.

    Returns full parameter schema and usage examples.
    """
    registry = get_tool_registry()
    tool = registry.get_tool(tool_name)

    if not tool:
        raise HTTPException(status_code=404, detail=f"Verktøy '{tool_name}' ikke funnet")

    return {
        "name": tool.name,
        "description": tool.description,
        "category": tool.category,
        "endpoint": tool.endpoint,
        "method": tool.method,
        "safety_level": tool.safety_level.value,
        "requires_confirmation": tool.requires_confirmation,
        "parameters": [
            {
                "name": p.name,
                "type": p.type,
                "description": p.description,
                "required": p.required,
                "default": p.default,
                "enum": p.enum,
            }
            for p in tool.parameters
        ],
    }
