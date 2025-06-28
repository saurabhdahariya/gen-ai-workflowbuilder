"""
PDF processing service for text extraction and document handling.
Uses PyMuPDF (fitz) for PDF text extraction.
"""

import os
import uuid
import fitz  # PyMuPDF
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class PDFService:
    """Service for handling PDF file operations."""
    
    def __init__(self):
        """Initialize PDF service with upload directory."""
        self.upload_dir = settings.upload_directory
        os.makedirs(self.upload_dir, exist_ok=True)
    
    async def save_uploaded_file(self, file: UploadFile) -> Tuple[str, str]:
        """
        Save uploaded file to disk and return file path and unique filename.
        
        Args:
            file: FastAPI UploadFile object
            
        Returns:
            Tuple of (file_path, unique_filename)
            
        Raises:
            HTTPException: If file operations fail
        """
        try:
            # Validate file type
            if not file.content_type or not file.content_type.startswith('application/pdf'):
                raise HTTPException(
                    status_code=400,
                    detail="Only PDF files are allowed"
                )
            
            # Generate unique filename
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(self.upload_dir, unique_filename)
            
            # Save file to disk
            with open(file_path, "wb") as buffer:
                content = await file.read()
                
                # Check file size
                if len(content) > settings.max_file_size:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File size exceeds maximum allowed size of {settings.max_file_size} bytes"
                    )
                
                buffer.write(content)
            
            logger.info(f"File saved successfully: {unique_filename}")
            return file_path, unique_filename
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to save uploaded file"
            )
    
    def extract_text_from_pdf(self, file_path: str) -> Tuple[str, int]:
        """
        Extract text content from PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Tuple of (extracted_text, page_count)
            
        Raises:
            HTTPException: If PDF processing fails
        """
        try:
            # Open PDF document
            doc = fitz.open(file_path)
            extracted_text = ""
            page_count = len(doc)
            
            # Extract text from each page
            for page_num in range(page_count):
                page = doc.load_page(page_num)
                text = page.get_text()
                extracted_text += f"\n--- Page {page_num + 1} ---\n{text}\n"
            
            doc.close()
            
            # Clean up extracted text
            extracted_text = self._clean_extracted_text(extracted_text)
            
            logger.info(f"Text extracted successfully from {page_count} pages")
            return extracted_text, page_count
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to extract text from PDF"
            )
    
    def _clean_extracted_text(self, text: str) -> str:
        """
        Clean and normalize extracted text.
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        # Remove excessive whitespace
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if line:  # Skip empty lines
                cleaned_lines.append(line)
        
        # Join lines with single newlines
        cleaned_text = '\n'.join(cleaned_lines)
        
        # Remove excessive consecutive newlines
        while '\n\n\n' in cleaned_text:
            cleaned_text = cleaned_text.replace('\n\n\n', '\n\n')
        
        return cleaned_text
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete file from disk.
        
        Args:
            file_path: Path to the file to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"File deleted successfully: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False
    
    def get_file_info(self, file_path: str) -> Optional[dict]:
        """
        Get file information.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary with file information or None if file doesn't exist
        """
        try:
            if os.path.exists(file_path):
                stat = os.stat(file_path)
                return {
                    "size": stat.st_size,
                    "created": stat.st_ctime,
                    "modified": stat.st_mtime
                }
            return None
        except Exception as e:
            logger.error(f"Error getting file info for {file_path}: {e}")
            return None
