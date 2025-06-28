"""
Main FastAPI application entry point.
Sets up the FastAPI app with middleware, routes, and startup/shutdown events.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import create_tables, engine
from app.api import documents, embeddings, workflow, chat
from app.services.vector_service_manager import get_shared_vector_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting up GenAI Workflow Builder API...")
    
    # Create upload directory if it doesn't exist
    os.makedirs(settings.upload_directory, exist_ok=True)
    
    # Create database tables
    try:
        create_tables()
        logger.info("Database initialization completed")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    # Initialize shared Vector Service (Qdrant with fallback to SimpleVectorService)
    try:
        vector_service = get_shared_vector_service()
        logger.info(f"{type(vector_service).__name__} initialization completed")
    except Exception as e:
        logger.error(f"Vector service initialization failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down GenAI Workflow Builder API...")
    engine.dispose()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A No-Code/Low-Code platform for building AI workflows",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(documents.router, prefix="/api")
app.include_router(embeddings.router, prefix="/api")
app.include_router(workflow.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Returns the application status and basic information.
    """
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "message": "GenAI Workflow Builder API is running successfully"
    }


@app.get("/")
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled exceptions.
    """
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )
