"""
Qdrant vector database service for document embeddings and similarity search.
Handles vector storage, retrieval, and semantic search operations.
"""

import hashlib
import logging
from typing import Dict, List, Optional, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from qdrant_client.http.exceptions import UnexpectedResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


class QdrantService:
    """
    Service for managing document embeddings using Qdrant vector database.
    
    Provides functionality for:
    - Storing document embeddings with metadata
    - Performing similarity search
    - Managing collections and points
    """
    
    def __init__(self):
        """Initialize Qdrant client and ensure collection exists."""
        try:
            self.client = QdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port,
                timeout=30
            )
            self.collection_name = settings.qdrant_collection_name
            self._ensure_collection_exists()
            logger.info(f"Connected to Qdrant at {settings.qdrant_host}:{settings.qdrant_port}")
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            raise Exception(f"Qdrant connection failed: {str(e)}")
    
    def _ensure_collection_exists(self):
        """Create collection if it doesn't exist."""
        try:
            # Check if collection exists
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                # Create collection with OpenAI embedding dimensions (1536)
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=1536,  # OpenAI text-embedding-ada-002 dimensions
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {self.collection_name}")
            else:
                logger.info(f"Using existing Qdrant collection: {self.collection_name}")
                
        except Exception as e:
            logger.error(f"Error ensuring collection exists: {e}")
            raise Exception(f"Failed to create/access collection: {str(e)}")
    
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
    
    async def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
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
            client = OpenAI(
                api_key=settings.openai_api_key,
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
        chunk_overlap: int = 200
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
            embeddings = await self._get_embeddings(chunks)
            
            # Prepare points for Qdrant
            points = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                point_id = self._generate_point_id(document_id, i, chunk)
                
                point = PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "document_id": document_id,
                        "chunk_index": i,
                        "text": chunk,
                        "chunk_size": len(chunk)
                    }
                )
                points.append(point)
            
            # Store points in Qdrant
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
            logger.info(f"Stored {len(points)} embeddings for document {document_id}")
            
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
        similarity_threshold: float = 0.7
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
            # Generate embedding for query
            query_embedding = await self._get_embeddings([query])
            
            # Prepare filter for specific document if provided
            query_filter = None
            if document_id is not None:
                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                )
            
            # Search for similar vectors
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding[0],
                query_filter=query_filter,
                limit=n_results,
                score_threshold=similarity_threshold
            )
            
            # Format results
            results = []
            for result in search_results:
                results.append({
                    "text": result.payload["text"],
                    "document_id": result.payload["document_id"],
                    "chunk_index": result.payload["chunk_index"],
                    "similarity_score": result.score,
                    "chunk_size": result.payload["chunk_size"]
                })
            
            logger.info(f"Found {len(results)} relevant chunks for query")
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
            
        Raises:
            Exception: If deletion fails
        """
        try:
            # Delete points with matching document_id
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                )
            )
            
            logger.info(f"Deleted embeddings for document {document_id}")
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
            collection_info = self.client.get_collection(self.collection_name)
            
            return {
                "collection_name": self.collection_name,
                "vectors_count": collection_info.vectors_count,
                "indexed_vectors_count": collection_info.indexed_vectors_count,
                "points_count": collection_info.points_count,
                "status": collection_info.status,
                "optimizer_status": collection_info.optimizer_status,
                "disk_data_size": collection_info.disk_data_size,
                "ram_data_size": collection_info.ram_data_size
            }
            
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {"error": str(e)}
