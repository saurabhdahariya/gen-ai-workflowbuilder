"""
Database configuration and session management.
Sets up SQLAlchemy engine, session factory, and base model with PostgreSQL support.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError
from sqlalchemy.pool import StaticPool
from typing import Generator
import logging
import time

from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_database_engine():
    """Create SQLAlchemy engine with proper configuration for PostgreSQL."""

    if settings.database_url.startswith("sqlite"):
        # SQLite configuration (fallback)
        logger.warning("Using SQLite - PostgreSQL is recommended for production")
        return create_engine(
            settings.database_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=settings.debug
        )
    elif settings.database_url.startswith("postgresql"):
        # PostgreSQL configuration (recommended)
        logger.info("Configuring PostgreSQL database connection")
        return create_engine(
            settings.database_url,
            pool_pre_ping=True,      # Verify connections before use
            pool_recycle=3600,       # Recycle connections every hour
            pool_size=10,            # Number of connections to maintain
            max_overflow=20,         # Additional connections when needed
            echo=settings.debug,     # Log SQL queries in debug mode
            connect_args={
                "connect_timeout": 10,
                "application_name": "genai_workflow_builder"
            }
        )
    else:
        # Generic database configuration
        return create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=settings.debug
        )

def wait_for_database(max_retries=5, retry_interval=2):
    """Wait for database to be available with retries."""
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                # Test connection with a simple query
                conn.execute(text("SELECT 1"))
                logger.info("✅ Database connection successful")
                return True
        except OperationalError as e:
            if attempt < max_retries - 1:
                logger.warning(f"⚠️  Database connection attempt {attempt + 1} failed: {e}")
                logger.info(f"🔄 Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                logger.error(f"❌ Failed to connect to database after {max_retries} attempts")
                logger.error("💡 Please ensure PostgreSQL is installed and running")
                logger.error("💡 Or update DATABASE_URL in .env file")
                raise
    return False

# Create engine
engine = create_database_engine()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Create all database tables with database availability check."""
    try:
        # Wait for database to be available
        logger.info("🔍 Checking database availability...")
        wait_for_database()

        # Create tables
        logger.info("📋 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")

        # Log database info
        if settings.database_url.startswith("postgresql"):
            logger.info("🐘 Using PostgreSQL database")
        elif settings.database_url.startswith("sqlite"):
            logger.info("📁 Using SQLite database")

    except Exception as e:
        logger.error(f"❌ Error creating database tables: {e}")
        raise


def drop_tables():
    """Drop all database tables (use with caution)."""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Error dropping database tables: {e}")
        raise
