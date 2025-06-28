"""
Configuration management for the application.
Loads environment variables and provides application settings.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application settings
    app_name: str = "GenAI Workflow Builder"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Database settings
    database_url: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:password@localhost:5432/genai_workflow"
    )
    
    # OpenAI settings
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # Qdrant settings
    qdrant_host: str = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port: int = int(os.getenv("QDRANT_PORT", "6333"))
    qdrant_collection_name: str = os.getenv("QDRANT_COLLECTION_NAME", "document_embeddings")
    
    # Security settings
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS settings
    allowed_origins: list = [
        "http://localhost:3000",  # React development server
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    
    # File upload settings
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    upload_directory: str = os.getenv("UPLOAD_DIRECTORY", "./uploads")

    # Web search settings (optional)
    serpapi_api_key: str = os.getenv("SERPAPI_API_KEY", "")
    enable_web_search: bool = os.getenv("ENABLE_WEB_SEARCH", "false").lower() == "true"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
