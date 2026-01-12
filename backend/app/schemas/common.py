"""Common schemas."""
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

DataT = TypeVar("DataT")


class PaginatedResponse(BaseModel, Generic[DataT]):
    """Paginated response."""
    items: list[DataT]
    total: int
    skip: int
    limit: int


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


class ErrorResponse(BaseModel):
    """Error response."""
    detail: str
    code: Optional[str] = None