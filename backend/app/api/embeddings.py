"""
Embeddings API endpoints for generating and managing vector embeddings.
Handles ChromaDB operations and OpenAI embedding generation.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.models.database import Document
from app.models.schemas import (
    EmbeddingGenerationRequest, 
    EmbeddingGenerationResponse,
    ErrorResponse
)
from app.services.vector_service_manager import get_shared_vector_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/embeddings", tags=["embeddings"])
# Get shared vector service instance
vector_service = get_shared_vector_service()
logger.info(f"Using {type(vector_service).__name__} for embeddings")


@router.post("/generate", response_model=EmbeddingGenerationResponse)
async def generate_embeddings(
    request: EmbeddingGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate embeddings for a document and store them in ChromaDB.
    
    Args:
        request: Embedding generation request with document ID and parameters
        db: Database session
        
    Returns:
        Embedding generation response with processing results
        
    Raises:
        HTTPException: If document not found or embedding generation fails
    """
    try:
        # Get document from database
        document = db.query(Document).filter(Document.id == request.document_id).first()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        if not document.extracted_text:
            raise HTTPException(
                status_code=400,
                detail="Document has no extracted text to process"
            )
        
        # Generate embeddings
        result = await vector_service.generate_embeddings(
            document_id=document.id,
            text=document.extracted_text,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            api_key=request.api_key
        )
        
        # Update document status
        if result["embeddings_generated"]:
            document.embeddings_generated = True
            db.commit()
        
        logger.info(f"Embeddings generated for document {request.document_id}")
        
        return EmbeddingGenerationResponse(
            document_id=result["document_id"],
            chunks_processed=result["chunks_processed"],
            embeddings_generated=result["embeddings_generated"],
            message=result["message"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate embeddings: {str(e)}"
        )


@router.get("/search")
async def search_embeddings(
    query: str,
    document_id: int = None,
    n_results: int = 5,
    db: Session = Depends(get_db)
):
    """
    Search for relevant text chunks using similarity search.
    
    Args:
        query: Search query text
        document_id: Optional document ID to filter results
        n_results: Number of results to return (max 20)
        db: Database session
        
    Returns:
        List of relevant text chunks with similarity scores
        
    Raises:
        HTTPException: If search fails
    """
    try:
        # Validate parameters
        if not query.strip():
            raise HTTPException(
                status_code=400,
                detail="Query cannot be empty"
            )
        
        if n_results > 20:
            n_results = 20
        
        # If document_id is provided, verify it exists
        if document_id is not None:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found"
                )
        
        # Search for relevant context
        results = await vector_service.get_relevant_context(
            query=query,
            document_id=document_id,
            n_results=n_results
        )
        
        logger.info(f"Search completed for query: '{query[:50]}...'")
        
        return {
            "query": query,
            "document_id": document_id,
            "results_count": len(results),
            "results": results
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching embeddings: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search embeddings: {str(e)}"
        )


@router.get("/test-pipeline/{document_id}")
async def test_pdf_pipeline(
    document_id: int,
    test_query: str = "What is my name?",
    db: Session = Depends(get_db)
):
    """
    Test the complete PDF processing pipeline for debugging.

    This endpoint helps verify that:
    1. PDF text was extracted properly
    2. Embeddings were generated and stored
    3. Vector search returns relevant results
    4. Context would be properly passed to LLM
    """
    try:
        # Step 1: Check if document exists and has extracted text
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Step 2: Check extracted text
        text_preview = document.extracted_text[:500] if document.extracted_text else "No text extracted"

        # Step 3: Check if embeddings were generated
        embeddings_status = "Generated" if document.embeddings_generated else "Not generated"

        # Step 4: Test vector search
        search_results = await vector_service.get_relevant_context(
            query=test_query,
            document_id=document_id,
            n_results=3
        )

        # Step 5: Prepare context as it would be sent to LLM
        context_texts = [chunk["text"] for chunk in search_results if chunk.get("text")]
        final_context = "\n\n".join(context_texts)

        return {
            "document_info": {
                "id": document.id,
                "filename": document.original_filename,
                "page_count": document.page_count,
                "file_size": document.file_size,
                "processed": document.processed,
                "embeddings_generated": document.embeddings_generated
            },
            "text_extraction": {
                "status": "Success" if document.extracted_text else "Failed",
                "text_length": len(document.extracted_text) if document.extracted_text else 0,
                "text_preview": text_preview
            },
            "embeddings": {
                "status": embeddings_status,
                "generated": document.embeddings_generated
            },
            "vector_search": {
                "test_query": test_query,
                "results_found": len(search_results),
                "results": search_results
            },
            "llm_context": {
                "context_length": len(final_context),
                "context_preview": final_context[:300] + "..." if len(final_context) > 300 else final_context,
                "would_have_context": len(final_context) > 0
            },
            "diagnosis": {
                "pdf_extracted": bool(document.extracted_text),
                "embeddings_ready": document.embeddings_generated,
                "search_working": len(search_results) > 0,
                "llm_would_have_context": len(final_context) > 0,
                "pipeline_healthy": all([
                    bool(document.extracted_text),
                    document.embeddings_generated,
                    len(search_results) > 0,
                    len(final_context) > 0
                ])
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing PDF pipeline: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test PDF pipeline: {str(e)}"
        )


@router.delete("/{document_id}")
async def delete_document_embeddings(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete all embeddings for a specific document.
    
    Args:
        document_id: ID of the document
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If document not found or deletion fails
    """
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        # Delete embeddings from Qdrant
        success = vector_service.delete_document_embeddings(document_id)
        
        if success:
            # Update document status
            document.embeddings_generated = False
            db.commit()
            
            logger.info(f"Embeddings deleted for document {document_id}")
            return {"message": "Document embeddings deleted successfully"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete embeddings"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting embeddings for document {document_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete embeddings: {str(e)}"
        )


@router.get("/stats")
async def get_embeddings_stats():
    """
    Get statistics about the embeddings collection.
    
    Returns:
        Collection statistics and information
    """
    try:
        stats = vector_service.get_collection_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting embeddings stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get embeddings statistics: {str(e)}"
        )
