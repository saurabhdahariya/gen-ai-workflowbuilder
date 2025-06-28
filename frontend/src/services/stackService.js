import axios from 'axios'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

class StackService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  // Document Management
  async uploadDocument(file) {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await this.api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async generateEmbeddings(documentId, chunkSize = 500, chunkOverlap = 100) {
    const response = await this.api.post('/api/embeddings/generate', {
      document_id: documentId,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
    })
    return response.data
  }

  async searchEmbeddings(query, documentId = null, nResults = 5, similarityThreshold = 0.7) {
    const params = new URLSearchParams({
      query,
      n_results: nResults.toString(),
      similarity_threshold: similarityThreshold.toString(),
    })
    
    if (documentId) {
      params.append('document_id', documentId.toString())
    }
    
    const response = await this.api.get(`/api/embeddings/search?${params}`)
    return response.data
  }

  async getDocuments() {
    const response = await this.api.get('/api/documents')
    return response.data
  }

  async deleteDocument(documentId) {
    const response = await this.api.delete(`/api/documents/${documentId}`)
    return response.data
  }

  // Workflow Execution
  async executeWorkflow(userId, query, workflow) {
    // Format workflow to match backend schema
    const formattedWorkflow = {
      nodes: workflow.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        data: node.data || {}
      })),
      connections: workflow.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null
      }))
    }

    const response = await this.api.post('/api/workflow/execute', {
      user_id: userId,
      query,
      workflow: formattedWorkflow,
    })
    return response.data
  }

  async validateWorkflow(workflow) {
    const response = await this.api.post('/api/workflow/validate', {
      workflow,
    })
    return response.data
  }

  // Chat Management
  async saveChatMessage(userId, message, response, workflowId = null) {
    const chatData = await this.api.post('/api/chat/save', {
      user_id: userId,
      message,
      response,
      workflow_id: workflowId,
    })
    return chatData.data
  }

  async getChatHistory(userId, limit = 50) {
    const response = await this.api.get(`/api/chat/history?user_id=${userId}&limit=${limit}`)
    return response.data
  }

  // Health Check
  async healthCheck() {
    const response = await this.api.get('/health')
    return response.data
  }

  // Utility Methods
  formatWorkflowForAPI(nodes, edges) {
    return {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        data: node.data || {},
      })),
      connections: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
      })),
    }
  }

  validateWorkflowStructure(nodes, edges) {
    // Check if we have all required node types
    const nodeTypes = nodes.map(n => n.type)
    const requiredTypes = ['user_query', 'knowledge_base', 'llm_engine', 'output']
    
    const hasAllTypes = requiredTypes.every(type => nodeTypes.includes(type))
    
    if (!hasAllTypes) {
      return {
        valid: false,
        error: 'Missing required components. Please add User Query, Knowledge Base, LLM Engine, and Output components.',
      }
    }

    // Check if nodes are connected in a valid flow
    const userQueryNode = nodes.find(n => n.type === 'user_query')
    const outputNode = nodes.find(n => n.type === 'output')
    
    if (!userQueryNode || !outputNode) {
      return {
        valid: false,
        error: 'User Query and Output components are required.',
      }
    }

    // Basic connectivity check
    if (edges.length < 3) {
      return {
        valid: false,
        error: 'Components must be connected in a workflow. Please connect your components.',
      }
    }

    return { valid: true }
  }

  // Error handling wrapper
  async safeApiCall(apiCall, errorMessage = 'An error occurred') {
    try {
      return await apiCall()
    } catch (error) {
      console.error(errorMessage, error)
      
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data.detail || error.response.data.message || errorMessage)
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Unable to connect to the server. Please check your connection.')
      } else {
        // Something else happened
        throw new Error(errorMessage)
      }
    }
  }
}

// Create singleton instance
const stackService = new StackService()

export default stackService
