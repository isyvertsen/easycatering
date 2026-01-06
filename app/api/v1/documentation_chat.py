"""Documentation chatbot API endpoint."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from app.services.documentation_chat_service import get_documentation_chat_service
from app.api.deps import get_current_user
from app.domain.entities.user import User

router = APIRouter()


class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(..., pattern="^(user|assistant)$", description="Message role: 'user' or 'assistant'")
    content: str = Field(..., min_length=1, description="Message content")


class ChatRequest(BaseModel):
    """Request for chat endpoint."""
    message: str = Field(..., min_length=1, max_length=2000, description="User's question or message")
    conversation_history: Optional[List[ChatMessage]] = Field(
        default=None,
        description="Previous messages in the conversation for context"
    )


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    success: bool
    message: str = Field(default="", description="AI assistant's response")
    error: Optional[str] = Field(default=None, description="Error message if request failed")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send a message to the documentation chatbot.

    The chatbot uses OpenAI GPT-4 to answer questions about the LKC system
    based on the system documentation.

    - Requires authentication
    - Conversation history is optional but helps maintain context
    - Maximum message length is 2000 characters
    """
    service = get_documentation_chat_service()

    # Convert Pydantic models to dicts for the service
    history = None
    if request.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]

    result = await service.chat(
        message=request.message,
        conversation_history=history
    )

    return ChatResponse(**result)
