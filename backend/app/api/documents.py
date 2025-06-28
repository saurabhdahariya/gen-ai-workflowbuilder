"""
Document upload and management API endpoints.
Handles PDF file uploads, text extraction, and document metadata storage.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.core.database import get_db
from app.models.database import Document
from app.models.schemas import DocumentUploadResponse, DocumentInfo
from app.services.pdf_service import PDFService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])
pdf_service = PDFService()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF document and extract its text content.
    
    Args:
        file: PDF file to upload
        db: Database session
        
    Returns:
        Document upload response with extracted text and metadata
        
    Raises:
        HTTPException: If upload or processing fails
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
        
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed"
            )
        
        # Save uploaded file
        file_path, unique_filename = await pdf_service.save_uploaded_file(file)
        
        # Extract text from PDF
        extracted_text, page_count = pdf_service.extract_text_from_pdf(file_path)
        
        # Create document record in database
        document = Document(
            filename=unique_filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=len(await file.read()) if hasattr(file, 'read') else 0,
            content_type=file.content_type or "application/pdf",
            extracted_text=extracted_text,
            page_count=page_count,
            processed=True
        )
        
        # Reset file position for size calculation
        await file.seek(0)
        content = await file.read()
        document.file_size = len(content)
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        logger.info(f"Document uploaded successfully: {document.id}")
        
        return DocumentUploadResponse.from_orm(document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        db.rollback()
        
        # Clean up file if it was saved
        if 'file_path' in locals():
            pdf_service.delete_file(file_path)
        
        raise HTTPException(
            status_code=500,
            detail="Failed to upload and process document"
        )


@router.get("/", response_model=List[DocumentInfo])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get list of uploaded documents.
    
    Args:
        skip: Number of documents to skip
        limit: Maximum number of documents to return
        db: Database session
        
    Returns:
        List of document information
    """
    try:
        documents = db.query(Document).offset(skip).limit(limit).all()
        return [DocumentInfo.from_orm(doc) for doc in documents]
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve documents"
        )


@router.get("/{document_id}", response_model=DocumentUploadResponse)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Get specific document by ID.
    
    Args:
        document_id: ID of the document to retrieve
        db: Database session
        
    Returns:
        Document information with extracted text
        
    Raises:
        HTTPException: If document not found
    """
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        return DocumentUploadResponse.from_orm(document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document {document_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve document"
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a document and its associated file.
    
    Args:
        document_id: ID of the document to delete
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If document not found or deletion fails
    """
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        # Delete file from disk
        pdf_service.delete_file(document.file_path)
        
        # Delete document record from database
        db.delete(document)
        db.commit()
        
        logger.info(f"Document deleted successfully: {document_id}")
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to delete document"
        )
