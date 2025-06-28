"""
Pydantic schemas for request/response models.
Defines the API input/output data structures.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class DocumentUploadResponse(BaseModel):
    """Response model for document upload."""
    id: int
    filename: str
    original_filename: str
    file_size: int
    content_type: str
    extracted_text: Optional[str] = None
    page_count: Optional[int] = None
    upload_timestamp: datetime
    processed: bool = False
    
    class Config:
        from_attributes = True


class DocumentInfo(BaseModel):
    """Basic document information model."""
    id: int
    filename: str
    original_filename: str
    file_size: int
    upload_timestamp: datetime
    processed: bool
    embeddings_generated: bool
    
    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message."""
    user_id: str = Field(..., min_length=1, max_length=100)
    query: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)
    document_id: Optional[int] = None
    workflow_config: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseModel):
    """Response model for chat messages."""
    id: int
    user_id: str
    query: str
    response: str
    document_id: Optional[int] = None
    workflow_config: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class WorkflowNode(BaseModel):
    """Schema for workflow node definition."""
    id: str
    type: str  # "user_query", "knowledge_base", "llm_engine", "output"
    position: Dict[str, float]  # {"x": 100, "y": 200}
    data: Dict[str, Any]  # Node-specific configuration


class WorkflowConnection(BaseModel):
    """Schema for workflow node connections."""
    source: str  # Source node ID
    target: str  # Target node ID
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class WorkflowDefinition(BaseModel):
    """Schema for complete workflow definition."""
    nodes: List[WorkflowNode]
    connections: List[WorkflowConnection]


class WorkflowExecutionRequest(BaseModel):
    """Request model for workflow execution."""
    user_id: str = Field(..., min_length=1, max_length=100)
    query: str = Field(..., min_length=1)
    workflow: WorkflowDefinition


class WorkflowExecutionResponse(BaseModel):
    """Response model for workflow execution."""
    execution_id: int
    response: str
    execution_time_ms: int
    status: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class EmbeddingGenerationRequest(BaseModel):
    """Request model for generating embeddings."""
    document_id: int
    chunk_size: Optional[int] = Field(default=1000, ge=100, le=5000)
    chunk_overlap: Optional[int] = Field(default=200, ge=0, le=1000)
    api_key: Optional[str] = Field(default=None, description="OpenAI API key for embeddings generation")


class EmbeddingGenerationResponse(BaseModel):
    """Response model for embedding generation."""
    document_id: int
    chunks_processed: int
    embeddings_generated: bool
    message: str


class HealthCheckResponse(BaseModel):
    """Response model for health check."""
    status: str
    app_name: str
    version: str
    message: str


class ErrorResponse(BaseModel):
    """Standard error response model."""
    detail: str
    message: Optional[str] = None
    error_code: Optional[str] = None
