"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    verify_token_with_blacklist,
)
from app.core.rate_limiter import auth_limiter, strict_limiter
from app.core.token_blacklist import add_to_blacklist, blacklist_all_user_tokens
from app.infrastructure.database.session import get_db
from app.domain.services.user_service import UserService
from app.schemas.auth import Token, TokenRefresh, LoginRequest, GoogleAuthRequest
from app.schemas.user import UserCreate, UserResponse

router = APIRouter()
security = HTTPBearer(auto_error=False)


@router.post("/register", response_model=UserResponse)
@strict_limiter.limit  # 3 per 5 minutes - prevent spam registration
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register new user."""
    user_service = UserService(db)
    
    # Check if user exists
    existing_user = await user_service.get_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = await user_service.create(
        email=user_data.email,
        full_name=user_data.full_name,
        password=user_data.password,
    )
    
    return user


@router.post("/login", response_model=Token)
@auth_limiter.limit  # 5 per minute - prevent brute force
async def login(
    request: Request,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password."""
    user_service = UserService(db)
    
    # Authenticate user
    user = await user_service.authenticate(credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Din konto venter på godkjenning fra administrator"
        )

    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
    )


@router.post("/refresh", response_model=Token)
@auth_limiter.limit  # 5 per minute
async def refresh_token(
    request: Request,
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token."""
    # Verify refresh token (with blacklist check)
    user_id = await verify_token_with_blacklist(token_data.refresh_token, token_type="refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Check if user exists and is active
    user_service = UserService(db)
    user = await user_service.get_by_id(int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
    )


@router.post("/google", response_model=Token)
@auth_limiter.limit  # 5 per minute
async def google_auth(
    request: Request,
    auth_data: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with Google OAuth."""
    # Verify Google token
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={auth_data.id_token}"
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token"
            )
        
        google_data = response.json()
    
    # Verify client ID
    if google_data.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client ID"
        )
    
    # Get or create user
    user_service = UserService(db)
    user = await user_service.get_by_google_id(google_data["sub"])
    
    if not user:
        # Check if email exists
        existing_user = await user_service.get_by_email(google_data["email"])
        if existing_user:
            # Email exists but not linked to Google - require password login first
            # This prevents account takeover if someone controls a Google account with victim's email
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="En konto med denne e-postadressen eksisterer allerede. "
                       "Logg inn med passord først, og koble deretter Google-kontoen din i innstillinger."
            )
        else:
            # Create new user (inactive until admin approval)
            user = await user_service.create(
                email=google_data["email"],
                full_name=google_data.get("name", google_data["email"]),
                google_id=google_data["sub"],
                is_active=False,
            )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Din konto venter på godkjenning fra administrator"
        )

    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
    )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Logout current session by blacklisting the access token.

    The token will be added to a blacklist and will no longer be valid,
    even if it hasn't expired yet.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )

    token = credentials.credentials

    # Verify token is valid before blacklisting
    user_id = verify_token(token, token_type="access")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # Add token to blacklist
    success = await add_to_blacklist(token, token_type="access")

    if success:
        return {"message": "Utlogget"}
    else:
        # Redis not available, but we still return success
        # (client should discard token anyway)
        return {"message": "Utlogget (token blacklist ikke tilgjengelig)"}


@router.post("/logout-all")
async def logout_all_sessions(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout all sessions for the current user.

    All tokens issued before this point will be invalidated,
    forcing re-login on all devices.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )

    token = credentials.credentials

    # Verify token
    user_id = verify_token(token, token_type="access")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # Blacklist all tokens for this user
    success = await blacklist_all_user_tokens(int(user_id))

    if success:
        return {"message": "Utlogget fra alle enheter"}
    else:
        return {"message": "Kunne ikke logge ut fra alle enheter (Redis ikke tilgjengelig)"}