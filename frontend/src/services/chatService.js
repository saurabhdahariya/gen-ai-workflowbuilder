import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ChatService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(message, workflow, onProgress = null) {
    try {
      // Convert frontend workflow format to backend format
      const backendWorkflow = this.convertWorkflowFormat(workflow);

      // Report progress steps
      const steps = this.getWorkflowSteps(backendWorkflow);
      let currentStep = 0;

      if (onProgress) {
        onProgress({ steps, currentStep, status: 'starting' });
      }

      // Simulate progress updates during execution
      const progressInterval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          currentStep++;
          if (onProgress) {
            onProgress({ steps, currentStep, status: 'processing' });
          }
        }
      }, 800);

      // Execute workflow with the backend
      const response = await this.api.post('/api/workflow/execute', {
        user_id: 'demo-user',
        query: message,
        workflow: backendWorkflow
      });

      clearInterval(progressInterval);

      // Final progress update
      if (onProgress) {
        onProgress({ steps, currentStep: steps.length, status: 'completed' });
      }

      return {
        content: response.data.response || 'I received your message and processed it through the workflow.',
        sources: response.data.sources || [],
        executionTime: response.data.execution_time_ms || 0
      };
    } catch (error) {
      console.error('Chat service error:', error);

      if (onProgress) {
        onProgress({ steps: [], currentStep: 0, status: 'error', error: error.message });
      }

      // Fallback response for demo purposes
      return {
        content: this.generateFallbackResponse(message),
        sources: ['Demo Knowledge Base'],
        executionTime: 1.2
      };
    }
  }

  getWorkflowSteps(workflow) {
    const steps = [
      { title: 'Processing Query', description: 'Analyzing user input' },
    ];

    // Add steps based on workflow nodes
    if (workflow.nodes.some(n => n.type === 'knowledge_base')) {
      steps.push({ title: 'Searching Knowledge Base', description: 'Finding relevant documents' });
    }

    if (workflow.nodes.some(n => n.type === 'llm_engine')) {
      steps.push({ title: 'Generating Response', description: 'AI is processing your request' });
    }

    steps.push({ title: 'Finalizing Output', description: 'Preparing response' });

    return steps;
  }

  convertWorkflowFormat(workflow) {
    // Convert frontend workflow format to backend format
    if (!workflow || !workflow.nodes) {
      // Default workflow with user_query -> llm_engine -> output
      return {
        nodes: [
          {
            id: "1",
            type: "user_query",
            position: { x: 100, y: 100 },
            data: { config: {} }
          },
          {
            id: "2",
            type: "llm_engine",
            position: { x: 200, y: 100 },
            data: { config: { model: "gpt-3.5-turbo", temperature: 0.7, max_tokens: 1000 } }
          },
          {
            id: "3",
            type: "output",
            position: { x: 300, y: 100 },
            data: { config: {} }
          }
        ],
        connections: [
          { source: "1", target: "2" },
          { source: "2", target: "3" }
        ]
      };
    }

    // Convert node types from frontend format to backend format
    const nodeTypeMap = {
      'userQuery': 'user_query',
      'knowledgeBase': 'knowledge_base',
      'llmEngine': 'llm_engine',
      'output': 'output'
    };

    const convertedNodes = workflow.nodes.map(node => ({
      id: node.id,
      type: nodeTypeMap[node.type] || node.type,
      position: node.position || { x: 0, y: 0 },
      data: node.data || { config: {} }
    }));

    return {
      nodes: convertedNodes,
      connections: workflow.connections || []
    };
  }

  generateFallbackResponse(message) {
    const responses = [
      `I understand you're asking about "${message}". Based on the workflow configuration, I would process this through the knowledge base and generate a comprehensive response.`,
      `Thank you for your question about "${message}". The AI workflow would typically search relevant documents and provide contextual information.`,
      `Your query "${message}" has been processed through the configured workflow. In a full implementation, this would involve document retrieval and AI-powered response generation.`,
      `I've received your message: "${message}". The workflow would normally execute knowledge base search, LLM processing, and formatted output generation.`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  async saveMessage(message, userId = 'demo-user') {
    try {
      await this.api.post('/api/chat/save', {
        user_id: userId,
        message: message.content,
        message_type: message.type,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  async getChatHistory(userId = 'demo-user') {
    try {
      const response = await this.api.get(`/api/chat/history/${userId}`);
      return response.data.messages || [];
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }
}

export const chatService = new ChatService();
