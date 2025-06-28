"""
SQLAlchemy database models for the application.
Defines the database schema and relationships.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Document(Base):
    """
    Document model for storing uploaded PDF files and their metadata.
    """
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100), nullable=False)
    extracted_text = Column(Text, nullable=True)
    page_count = Column(Integer, nullable=True)
    upload_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    processed = Column(Boolean, default=False)
    embeddings_generated = Column(Boolean, default=False)
    
    # Relationship to chat messages
    chat_messages = relationship("ChatMessage", back_populates="document")


class ChatMessage(Base):
    """
    Chat message model for storing conversation history.
    """
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    workflow_config = Column(Text, nullable=True)  # JSON string of workflow configuration
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to document
    document = relationship("Document", back_populates="chat_messages")


class WorkflowExecution(Base):
    """
    Workflow execution model for tracking workflow runs.
    """
    __tablename__ = "workflow_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    workflow_config = Column(Text, nullable=False)  # JSON string of workflow configuration
    input_query = Column(Text, nullable=False)
    output_response = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="pending")  # pending, running, completed, failed
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
