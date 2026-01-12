"""Documentation schemas."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentationFile(BaseModel):
    """Documentation file metadata."""
    path: str = Field(..., description="Relative path to the documentation file")
    name: str = Field(..., description="File name")
    title: Optional[str] = Field(None, description="Document title extracted from content")
    size: int = Field(..., description="File size in bytes")
    modified: datetime = Field(..., description="Last modified timestamp")


class DocumentationContent(BaseModel):
    """Documentation file content."""
    path: str = Field(..., description="File path")
    name: str = Field(..., description="File name")
    title: Optional[str] = Field(None, description="Document title")
    raw_content: str = Field(..., description="Raw markdown content")
    html_content: str = Field(..., description="Parsed HTML content")
    has_mermaid: bool = Field(False, description="Whether the document contains mermaid diagrams")


class ImageUploadResponse(BaseModel):
    """Image upload response."""
    url: str = Field(..., description="URL to access the uploaded image")
    filename: str = Field(..., description="Uploaded filename")


class GitHubIssue(BaseModel):
    """GitHub issue information."""
    number: int
    title: str
    state: str
    created_at: datetime
    updated_at: datetime
    html_url: str
    user: str
    labels: List[str]


class GitHubPullRequest(BaseModel):
    """GitHub pull request information."""
    number: int
    title: str
    state: str
    created_at: datetime
    updated_at: datetime
    html_url: str
    user: str
    draft: bool
    mergeable: Optional[bool] = None


class GitHubStatusResponse(BaseModel):
    """GitHub status response."""
    repository: str
    open_issues: List[GitHubIssue]
    open_pull_requests: List[GitHubPullRequest]
    total_open_issues: int
    total_open_prs: int
