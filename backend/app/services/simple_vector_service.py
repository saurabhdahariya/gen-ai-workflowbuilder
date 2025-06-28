"""
Simple in-memory vector service for development and testing.
This service provides basic vector storage and similarity search without external dependencies.
"""

import hashlib
import logging
import numpy as np
from typing import Dict, List, Optional, Any
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings

logger = logging.getLogger(__name__)


class SimpleVectorService:
    """
    Simple in-memory vector database service for document embeddings.
    
    This is a lightweight alternative to Qdrant for development and testing.
    Provides basic functionality for storing and searching document embeddings.
    """
    
    def __init__(self):
        """Initialize the simple vector service."""
        self.vectors = {}  # {point_id: {"vector": [...], "payload": {...}}}
        self.document_points = {}  # {document_id: [point_ids]}
        logger.info("Initialized SimpleVectorService (in-memory)")
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """
        Split text into overlapping chunks for embedding.
        
        Args:
            text: Text to chunk
            chunk_size: Maximum size of each chunk
            chunk_overlap: Number of characters to overlap between chunks
            
        Returns:
            List of text chunks
        """
        if not text or len(text) <= chunk_size:
            return [text] if text else []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # If this isn't the last chunk, try to break at a word boundary
            if end < len(text):
                # Look for the last space within the chunk
                last_space = text.rfind(' ', start, end)
                if last_space > start:
                    end = last_space
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = end - chunk_overlap if end < len(text) else end
            
            # Prevent infinite loop
            if start >= len(text):
                break
        
        return chunks
    
    async def _get_embeddings(self, texts: List[str], api_key: Optional[str] = None) -> List[List[float]]:
        """
        Generate embeddings for text chunks using OpenAI.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
            
        Raises:
            Exception: If OpenAI API call fails
        """
        try:
            from openai import OpenAI

            # Use provided API key or fall back to settings
            effective_api_key = api_key or settings.openai_api_key
            if not effective_api_key:
                raise ValueError("OpenAI API key is required for embeddings generation")

            client = OpenAI(
                api_key=effective_api_key,
                timeout=30.0  # Add timeout
            )

            response = client.embeddings.create(
                model="text-embedding-ada-002",
                input=texts
            )

            embeddings = [item.embedding for item in response.data]
            logger.info(f"Generated {len(embeddings)} embeddings")
            return embeddings

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise Exception(f"Failed to generate embeddings: {str(e)}")
    
    def _generate_point_id(self, document_id: int, chunk_index: int, chunk_text: str) -> str:
        """
        Generate unique ID for a vector point.
        
        Args:
            document_id: ID of the source document
            chunk_index: Index of the chunk within the document
            chunk_text: Text content of the chunk
            
        Returns:
            Unique point ID
        """
        # Create hash of chunk content for uniqueness
        content_hash = hashlib.md5(chunk_text.encode()).hexdigest()[:8]
        return f"doc_{document_id}_chunk_{chunk_index}_{content_hash}"
    
    async def generate_embeddings(
        self,
        document_id: int,
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate and store embeddings for document text.
        
        Args:
            document_id: ID of the document
            text: Text content to embed
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            
        Returns:
            Dictionary with processing results
            
        Raises:
            Exception: If embedding generation fails
        """
        try:
            # Split text into chunks
            chunks = self._chunk_text(text, chunk_size, chunk_overlap)
            logger.info(f"Split document {document_id} into {len(chunks)} chunks")
            
            if not chunks:
                return {
                    "document_id": document_id,
                    "chunks_processed": 0,
                    "embeddings_generated": False,
                    "message": "No text content to process"
                }
            
            # Generate embeddings for chunks
            embeddings = await self._get_embeddings(chunks, api_key)
            
            # Store vectors in memory
            point_ids = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                point_id = self._generate_point_id(document_id, i, chunk)
                
                self.vectors[point_id] = {
                    "vector": embedding,
                    "payload": {
                        "document_id": document_id,
                        "chunk_index": i,
                        "text": chunk,
                        "chunk_size": len(chunk)
                    }
                }
                point_ids.append(point_id)
            
            # Track points for this document
            self.document_points[document_id] = point_ids
            
            logger.info(f"Stored {len(point_ids)} embeddings for document {document_id}")
            
            return {
                "document_id": document_id,
                "chunks_processed": len(chunks),
                "embeddings_generated": True,
                "message": f"Successfully generated embeddings for {len(chunks)} chunks"
            }
            
        except Exception as e:
            logger.error(f"Error generating embeddings for document {document_id}: {e}")
            raise Exception(f"Failed to generate embeddings: {str(e)}")
    
    async def get_relevant_context(
        self,
        query: str,
        document_id: Optional[int] = None,
        n_results: int = 5,
        similarity_threshold: float = 0.5  # Lower threshold for better results
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant text chunks using similarity search.
        
        Args:
            query: Search query text
            document_id: Optional document ID to filter results
            n_results: Number of results to return
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of relevant text chunks with metadata
            
        Raises:
            Exception: If search fails
        """
        try:
            if not self.vectors:
                logger.info("No vectors stored yet")
                return []
            
            # Generate embedding for query
            query_embedding = await self._get_embeddings([query])
            query_vector = np.array(query_embedding[0]).reshape(1, -1)
            
            # Filter vectors by document if specified
            candidate_points = []
            if document_id is not None:
                if document_id in self.document_points:
                    candidate_points = [(pid, self.vectors[pid]) for pid in self.document_points[document_id]]
                else:
                    logger.info(f"No vectors found for document {document_id}")
                    return []
            else:
                candidate_points = list(self.vectors.items())
            
            if not candidate_points:
                logger.info("No candidate vectors found")
                return []
            
            # Calculate similarities
            similarities = []
            for point_id, point_data in candidate_points:
                vector = np.array(point_data["vector"]).reshape(1, -1)
                similarity = cosine_similarity(query_vector, vector)[0][0]
                
                if similarity >= similarity_threshold:
                    similarities.append({
                        "point_id": point_id,
                        "similarity": similarity,
                        "payload": point_data["payload"]
                    })
            
            # Sort by similarity and limit results
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            similarities = similarities[:n_results]
            
            # Format results
            results = []
            for item in similarities:
                results.append({
                    "text": item["payload"]["text"],
                    "document_id": item["payload"]["document_id"],
                    "chunk_index": item["payload"]["chunk_index"],
                    "similarity_score": item["similarity"],
                    "chunk_size": item["payload"]["chunk_size"]
                })
            
            logger.info(f"🔍 Found {len(results)} relevant chunks for query: '{query}'")

            # Debug: Print retrieved context
            for i, result in enumerate(results):
                logger.info(f"📄 Chunk {i+1} (similarity: {result['similarity_score']:.3f}): {result['text'][:100]}...")

            return results
            
        except Exception as e:
            logger.error(f"Error searching for relevant context: {e}")
            raise Exception(f"Failed to search embeddings: {str(e)}")
    
    def delete_document_embeddings(self, document_id: int) -> bool:
        """
        Delete all embeddings for a specific document.
        
        Args:
            document_id: ID of the document
            
        Returns:
            True if deletion was successful
        """
        try:
            if document_id in self.document_points:
                # Delete all points for this document
                for point_id in self.document_points[document_id]:
                    if point_id in self.vectors:
                        del self.vectors[point_id]
                
                # Remove document tracking
                del self.document_points[document_id]
                
                logger.info(f"Deleted embeddings for document {document_id}")
                return True
            else:
                logger.info(f"No embeddings found for document {document_id}")
                return True
            
        except Exception as e:
            logger.error(f"Error deleting embeddings for document {document_id}: {e}")
            return False
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the embeddings collection.
        
        Returns:
            Collection statistics and information
        """
        try:
            total_vectors = len(self.vectors)
            total_documents = len(self.document_points)
            
            return {
                "service_type": "SimpleVectorService",
                "total_vectors": total_vectors,
                "total_documents": total_documents,
                "vectors_per_document": {
                    str(doc_id): len(point_ids) 
                    for doc_id, point_ids in self.document_points.items()
                },
                "status": "active"
            }
            
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {"error": str(e)}
