"""
Vector Service Manager - Singleton pattern for shared vector service instance.
Ensures that all parts of the application use the same vector service instance.
"""

import logging
from typing import Optional, Union

from app.services.qdrant_service import QdrantService
from app.services.simple_vector_service import SimpleVectorService

logger = logging.getLogger(__name__)


class VectorServiceManager:
    """
    Singleton manager for vector service instances.
    Ensures all parts of the application use the same vector service.
    """
    
    _instance: Optional['VectorServiceManager'] = None
    _vector_service: Optional[Union[QdrantService, SimpleVectorService]] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorServiceManager, cls).__new__(cls)
        return cls._instance
    
    def get_vector_service(self) -> Union[QdrantService, SimpleVectorService]:
        """
        Get the shared vector service instance.
        Creates one if it doesn't exist.
        """
        if self._vector_service is None:
            self._initialize_vector_service()
        return self._vector_service
    
    def _initialize_vector_service(self):
        """Initialize vector service with fallback."""
        try:
            # Try to initialize Qdrant first
            self._vector_service = QdrantService()
            logger.info("✅ Using QdrantService (shared instance)")
        except Exception as e:
            logger.warning(f"Qdrant not available: {e}")
            # Fallback to SimpleVectorService
            self._vector_service = SimpleVectorService()
            logger.info("✅ Using SimpleVectorService (shared instance)")
    
    def reset_service(self):
        """Reset the vector service (for testing purposes)."""
        self._vector_service = None
        logger.info("🔄 Vector service reset")


# Global function to get the shared vector service
def get_shared_vector_service() -> Union[QdrantService, SimpleVectorService]:
    """
    Get the shared vector service instance.
    This ensures all parts of the application use the same instance.
    """
    manager = VectorServiceManager()
    return manager.get_vector_service()
