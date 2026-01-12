"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.infrastructure.database.session import get_db
from app.domain.services.user_service import UserService
from app.schemas.auth import Token, TokenRefresh, LoginRequest, GoogleAuthRequest
from app.schemas.user import UserCreate, UserResponse

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(
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
async def login(
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
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token."""
    # Verify refresh token
    user_id = verify_token(token_data.refresh_token, token_type="refresh")
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
async def google_auth(
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
        user = await user_service.get_by_email(google_data["email"])
        if user:
            # Link Google account
            user.google_id = google_data["sub"]
            await db.commit()
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