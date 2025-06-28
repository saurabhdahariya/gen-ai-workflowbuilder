import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class DocumentService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // Longer timeout for file uploads
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async uploadDocument(file, onProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      const response = await this.api.post('/api/documents/upload', formData, config);
      return response.data;
    } catch (error) {
      console.error('Document upload error:', error);
      throw new Error('Failed to upload document');
    }
  }

  async getDocuments() {
    try {
      const response = await this.api.get('/api/documents/', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.documents || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  async getDocument(documentId) {
    try {
      const response = await this.api.get(`/api/documents/${documentId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw new Error('Failed to fetch document');
    }
  }

  async deleteDocument(documentId) {
    try {
      await this.api.delete(`/api/documents/${documentId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  async searchDocuments(query, maxResults = 5) {
    try {
      const response = await this.api.get('/api/embeddings/search', {
        params: {
          query,
          max_results: maxResults,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  async getEmbeddingStats() {
    try {
      const response = await this.api.get('/api/embeddings/stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching embedding stats:', error);
      return {
        total_documents: 0,
        total_embeddings: 0,
        last_updated: null
      };
    }
  }

  // Utility methods
  validateFile(file) {
    const allowedTypes = ['application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF files are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    return true;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const documentService = new DocumentService();
