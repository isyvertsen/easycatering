"""Main FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.migrations import run_migrations
from app.core.exceptions import setup_exception_handlers
from app.api import health, auth, anonymization, admin
from app.api.v1 import api_router as v1_router
from app.infrastructure.database.session import engine, Base

# Import all models to ensure they're registered with Base.metadata
import app.models  # noqa: F401

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifecycle events."""
    logger.info("Starting up Catering System API...")
    
    # Run database migrations
    try:
        logger.info("Running database migrations...")
        await run_migrations(engine)
        logger.info("Database migrations completed successfully")
    except Exception as e:
        logger.error(f"Failed to run migrations: {str(e)}")
        # You might want to fail startup if migrations fail
        # raise
    
    yield
    logger.info("Shutting down Catering System API...")


app = FastAPI(
    title="Catering System API",
    description="API for Larvik Kommune Catering Management System",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Setup centralized exception handlers
setup_exception_handlers(app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(anonymization.router, prefix="/api/anonymization", tags=["anonymization"])
app.include_router(v1_router, prefix="/api/v1")  # Typed endpoints only


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Catering System API",
        "version": "0.1.0",
        "docs": "/api/docs",
        "endpoints": {
            "health": "/api/health",
            "auth": "/api/auth",
            "typed_api": {
                "ansatte": "/api/v1/ansatte",
                "kunder": "/api/v1/kunder",
                "ordrer": "/api/v1/ordrer",
                "produkter": "/api/v1/produkter",
                "leverandorer": "/api/v1/leverandorer",
                "kategorier": "/api/v1/kategorier",
                "askony": "/api/v1/askony",
                "meny": "/api/v1/meny",
                "kalkyle": "/api/v1/kalkyle"
            }
        }
    }