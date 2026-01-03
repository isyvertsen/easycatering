"""Feedback and GitHub issue creation endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from app.services.feedback_ai_service import get_feedback_ai_service
from app.services.github_service import get_github_service
from app.api.deps import get_current_user
from app.domain.entities.user import User
from app.core.config import settings

router = APIRouter()


class AnalyzeRequest(BaseModel):
    """Request for AI analysis of feedback."""
    type: str = Field(..., pattern="^(bug|feature)$", description="Type of feedback: 'bug' or 'feature'")
    title: str = Field(..., min_length=3, max_length=200, description="Short title for the feedback")
    description: str = Field(..., min_length=10, description="Detailed description of the issue or feature")
    answers: Optional[Dict[str, str]] = Field(default=None, description="Answers to follow-up questions")


class AnalyzeResponse(BaseModel):
    """Response from AI analysis."""
    success: bool
    needsMoreInfo: bool
    followUpQuestions: Optional[List[str]] = None
    improvedTitle: Optional[str] = None
    improvedDescription: Optional[str] = None
    detectedTypes: Optional[List[str]] = None
    existingFeature: Optional[str] = None
    suggestSplit: Optional[bool] = None
    targetRepositories: Optional[List[str]] = None  # ["backend"], ["frontend"], or both
    error: Optional[str] = None


class CreateIssueRequest(BaseModel):
    """Request to create GitHub issue."""
    type: str = Field(..., pattern="^(bug|feature)$", description="Type of issue: 'bug' or 'feature'")
    title: str = Field(..., min_length=3, max_length=200, description="Issue title")
    description: str = Field(..., min_length=10, description="Issue description")
    browserInfo: str = Field(..., description="Browser and platform information")
    currentUrl: str = Field(..., description="URL where the issue was reported from")
    aiImproved: bool = Field(default=False, description="Whether the feedback was improved by AI")
    targetRepositories: Optional[List[str]] = Field(default=None, description="Which repositories to create issues in")


class IssueInfo(BaseModel):
    """Information about a created issue."""
    repository: str
    url: str
    number: int


class CreateIssueResponse(BaseModel):
    """Response from issue creation."""
    success: bool
    issues: Optional[List[IssueInfo]] = None  # List of created issues
    issueUrl: Optional[str] = None  # Primary issue URL (first one, for backward compatibility)
    issueNumber: Optional[int] = None  # Primary issue number (first one, for backward compatibility)
    errors: Optional[List[str]] = None  # Any errors that occurred
    error: Optional[str] = None  # General error message


class VersionResponse(BaseModel):
    """Application version response."""
    version: str


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_feedback(
    request: AnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze feedback with AI and suggest improvements.

    This endpoint uses AI to:
    - Check if the description is clear and complete
    - Detect if it's actually a bug, feature, or both
    - Check if the requested feature already exists
    - Suggest follow-up questions if more information is needed
    - Improve the title and description for clarity
    """
    service = get_feedback_ai_service()

    result = await service.analyze_feedback(
        feedback_type=request.type,
        title=request.title,
        description=request.description,
        answers=request.answers
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "AI analysis failed"))

    return AnalyzeResponse(**result)


@router.post("/create-issue", response_model=CreateIssueResponse)
async def create_github_issue(
    request: CreateIssueRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a GitHub issue from feedback.

    This endpoint creates a GitHub issue with:
    - The improved title and description
    - System metadata (version, user, browser, timestamp)
    - Appropriate labels (bug/enhancement, user-reported)

    Returns the URL and number of the created issue.
    """
    service = get_github_service()

    # Get user name and email
    user_name = current_user.full_name if hasattr(current_user, 'full_name') and current_user.full_name else current_user.email
    user_email = current_user.email

    result = await service.create_issue(
        title=request.title,
        description=request.description,
        issue_type=request.type,
        user_email=user_email,
        user_name=user_name,
        browser_info=request.browserInfo,
        current_url=request.currentUrl,
        ai_improved=request.aiImproved,
        target_repositories=request.targetRepositories
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to create issue"))

    return CreateIssueResponse(**result)


@router.get("/version", response_model=VersionResponse)
async def get_app_version():
    """
    Get application version for issue metadata.

    Returns the application name/version from settings.
    """
    return VersionResponse(version=settings.APP_NAME)
