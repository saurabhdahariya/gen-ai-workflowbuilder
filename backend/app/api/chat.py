"""
Chat API endpoints for conversation logging and history management.
Handles chat message storage and retrieval from PostgreSQL.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import json
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.database import ChatMessage, Document
from app.models.schemas import (
    ChatMessageCreate,
    ChatMessageResponse,
    ErrorResponse
)
from app.services.orchestrator import Orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=dict)
async def chat_with_workflow(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Execute a chat conversation with the workflow.

    Args:
        request: Chat request containing message and workflow
        db: Database session

    Returns:
        Chat response from the workflow

    Raises:
        HTTPException: If chat execution fails
    """
    try:
        message = request.get("message", "")
        workflow = request.get("workflow", {})

        if not message:
            raise HTTPException(
                status_code=400,
                detail="Message is required"
            )

        if not workflow:
            raise HTTPException(
                status_code=400,
                detail="Workflow is required"
            )

        # Create orchestrator and execute workflow
        orchestrator = Orchestrator()

        # Execute the workflow with the chat message
        result = await orchestrator.execute_workflow(
            workflow_definition=workflow,
            user_query=message,
            user_id="chat-user"
        )

        logger.info(f"Chat executed successfully for message: {message[:50]}...")

        return {
            "response": result.get("response", "No response generated"),
            "execution_time": result.get("execution_time", 0),
            "status": "success"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat execution: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Chat execution failed: {str(e)}"
        )


@router.post("/save", response_model=ChatMessageResponse)
async def save_chat_message(
    message: ChatMessageCreate,
    db: Session = Depends(get_db)
):
    """
    Save a chat conversation (user query and AI response) to the database.
    
    Args:
        message: Chat message data to save
        db: Database session
        
    Returns:
        Saved chat message with ID and timestamp
        
    Raises:
        HTTPException: If saving fails or document not found
    """
    try:
        # Validate document exists if document_id is provided
        if message.document_id is not None:
            document = db.query(Document).filter(Document.id == message.document_id).first()
            if not document:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found"
                )
        
        # Convert workflow_config to JSON string if provided
        workflow_config_str = None
        if message.workflow_config is not None:
            workflow_config_str = json.dumps(message.workflow_config)
        
        # Create chat message record
        chat_message = ChatMessage(
            user_id=message.user_id,
            query=message.query,
            response=message.response,
            document_id=message.document_id,
            workflow_config=workflow_config_str
        )
        
        db.add(chat_message)
        db.commit()
        db.refresh(chat_message)
        
        logger.info(f"Chat message saved for user {message.user_id}")
        
        return ChatMessageResponse.from_orm(chat_message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving chat message: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save chat message: {str(e)}"
        )


@router.get("/history/{user_id}", response_model=List[ChatMessageResponse])
async def get_chat_history(
    user_id: str,
    skip: int = Query(0, ge=0, description="Number of messages to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of messages to return"),
    document_id: Optional[int] = Query(None, description="Filter by document ID"),
    days: Optional[int] = Query(None, ge=1, le=365, description="Filter by number of days back"),
    db: Session = Depends(get_db)
):
    """
    Get chat history for a specific user.
    
    Args:
        user_id: ID of the user
        skip: Number of messages to skip for pagination
        limit: Maximum number of messages to return
        document_id: Optional filter by document ID
        days: Optional filter by number of days back
        db: Database session
        
    Returns:
        List of chat messages for the user
        
    Raises:
        HTTPException: If retrieval fails
    """
    try:
        # Build query
        query = db.query(ChatMessage).filter(ChatMessage.user_id == user_id)
        
        # Apply document filter if provided
        if document_id is not None:
            query = query.filter(ChatMessage.document_id == document_id)
        
        # Apply date filter if provided
        if days is not None:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(ChatMessage.timestamp >= cutoff_date)
        
        # Order by timestamp (most recent first) and apply pagination
        messages = (
            query.order_by(ChatMessage.timestamp.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        logger.info(f"Retrieved {len(messages)} chat messages for user {user_id}")
        
        return [ChatMessageResponse.from_orm(message) for message in messages]
        
    except Exception as e:
        logger.error(f"Error retrieving chat history for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chat history: {str(e)}"
        )


@router.get("/message/{message_id}", response_model=ChatMessageResponse)
async def get_chat_message(
    message_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific chat message by ID.
    
    Args:
        message_id: ID of the chat message
        db: Database session
        
    Returns:
        Chat message details
        
    Raises:
        HTTPException: If message not found
    """
    try:
        message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
        
        if not message:
            raise HTTPException(
                status_code=404,
                detail="Chat message not found"
            )
        
        return ChatMessageResponse.from_orm(message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving chat message {message_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chat message: {str(e)}"
        )


@router.delete("/message/{message_id}")
async def delete_chat_message(
    message_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific chat message.
    
    Args:
        message_id: ID of the chat message to delete
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If message not found or deletion fails
    """
    try:
        message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
        
        if not message:
            raise HTTPException(
                status_code=404,
                detail="Chat message not found"
            )
        
        db.delete(message)
        db.commit()
        
        logger.info(f"Chat message {message_id} deleted successfully")
        
        return {"message": "Chat message deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat message {message_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete chat message: {str(e)}"
        )


@router.delete("/history/{user_id}")
async def clear_chat_history(
    user_id: str,
    document_id: Optional[int] = Query(None, description="Clear only messages for specific document"),
    days: Optional[int] = Query(None, ge=1, le=365, description="Clear messages older than N days"),
    db: Session = Depends(get_db)
):
    """
    Clear chat history for a user.
    
    Args:
        user_id: ID of the user
        document_id: Optional filter to clear only messages for specific document
        days: Optional filter to clear only messages older than N days
        db: Database session
        
    Returns:
        Number of messages deleted
        
    Raises:
        HTTPException: If deletion fails
    """
    try:
        # Build query
        query = db.query(ChatMessage).filter(ChatMessage.user_id == user_id)
        
        # Apply document filter if provided
        if document_id is not None:
            query = query.filter(ChatMessage.document_id == document_id)
        
        # Apply date filter if provided
        if days is not None:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(ChatMessage.timestamp < cutoff_date)
        
        # Count messages to be deleted
        message_count = query.count()
        
        # Delete messages
        query.delete(synchronize_session=False)
        db.commit()
        
        logger.info(f"Cleared {message_count} chat messages for user {user_id}")
        
        return {
            "message": f"Successfully cleared {message_count} chat messages",
            "deleted_count": message_count
        }
        
    except Exception as e:
        logger.error(f"Error clearing chat history for user {user_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear chat history: {str(e)}"
        )


@router.get("/stats/{user_id}")
async def get_user_chat_stats(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get chat statistics for a specific user.
    
    Args:
        user_id: ID of the user
        db: Database session
        
    Returns:
        Chat statistics for the user
    """
    try:
        # Total messages
        total_messages = db.query(ChatMessage).filter(ChatMessage.user_id == user_id).count()
        
        # Messages in last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_messages = db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id,
            ChatMessage.timestamp >= week_ago
        ).count()
        
        # Messages by document
        document_stats = (
            db.query(
                ChatMessage.document_id,
                db.func.count(ChatMessage.id).label('message_count')
            )
            .filter(ChatMessage.user_id == user_id)
            .group_by(ChatMessage.document_id)
            .all()
        )
        
        # First and last message timestamps
        first_message = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.timestamp.asc())
            .first()
        )
        
        last_message = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.timestamp.desc())
            .first()
        )
        
        return {
            "user_id": user_id,
            "total_messages": total_messages,
            "recent_messages_7_days": recent_messages,
            "first_message_date": first_message.timestamp if first_message else None,
            "last_message_date": last_message.timestamp if last_message else None,
            "messages_by_document": [
                {
                    "document_id": stat.document_id,
                    "message_count": stat.message_count
                }
                for stat in document_stats
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting chat stats for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chat statistics: {str(e)}"
        )


@router.get("/stats")
async def get_global_chat_stats(db: Session = Depends(get_db)):
    """
    Get global chat statistics across all users.
    
    Args:
        db: Database session
        
    Returns:
        Global chat statistics
    """
    try:
        # Total messages and users
        total_messages = db.query(ChatMessage).count()
        unique_users = db.query(ChatMessage.user_id).distinct().count()
        
        # Messages in last 24 hours
        day_ago = datetime.utcnow() - timedelta(days=1)
        recent_messages = db.query(ChatMessage).filter(
            ChatMessage.timestamp >= day_ago
        ).count()
        
        # Average messages per user
        avg_messages_per_user = total_messages / unique_users if unique_users > 0 else 0
        
        return {
            "total_messages": total_messages,
            "unique_users": unique_users,
            "recent_messages_24h": recent_messages,
            "average_messages_per_user": round(avg_messages_per_user, 2)
        }
        
    except Exception as e:
        logger.error(f"Error getting global chat stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve global chat statistics: {str(e)}"
        )
