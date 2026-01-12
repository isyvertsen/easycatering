"""Schemas for preparation instructions."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PreparationInstructionCreate(BaseModel):
    """Schema for creating a preparation instruction."""
    text: str
    is_active: bool = True
    ai_enhanced: bool = False


class PreparationInstructionUpdate(BaseModel):
    """Schema for updating a preparation instruction."""
    text: Optional[str] = None
    is_active: Optional[bool] = None
    ai_enhanced: Optional[bool] = None


class PreparationInstructionResponse(BaseModel):
    """Response schema for a preparation instruction."""
    id: int
    text: str
    is_active: bool
    ai_enhanced: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PreparationInstructionListResponse(BaseModel):
    """Response for list of preparation instructions."""
    items: list[PreparationInstructionResponse]
    total: int
    skip: int
    limit: int


class EnhanceInstructionRequest(BaseModel):
    """Request for AI to enhance an instruction."""
    text: str


class EnhanceInstructionResponse(BaseModel):
    """Response with AI-enhanced instruction."""
    original_text: str
    enhanced_text: str
    reasoning: str
