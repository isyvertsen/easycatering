"""Authentication schemas."""
from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """Token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None


class TokenRefresh(BaseModel):
    """Token refresh request."""
    refresh_token: str


class LoginRequest(BaseModel):
    """Login request."""
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    """Google auth request."""
    id_token: str