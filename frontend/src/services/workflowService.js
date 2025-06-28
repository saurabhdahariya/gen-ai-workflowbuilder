import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class WorkflowService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async executeWorkflow(workflow, userMessage) {
    try {
      const response = await this.api.post('/api/workflow/execute', {
        workflow,
        message: userMessage,
        user_id: 'demo-user'
      });

      return response.data;
    } catch (error) {
      console.error('Workflow execution error:', error);
      throw new Error('Failed to execute workflow');
    }
  }

  async validateWorkflow(workflow) {
    try {
      const response = await this.api.post('/api/workflow/validate', {
        workflow
      });

      return response.data;
    } catch (error) {
      console.error('Workflow validation error:', error);
      return { valid: false, errors: ['Validation service unavailable'] };
    }
  }

  async getWorkflowExecutions(userId = 'demo-user') {
    try {
      const response = await this.api.get(`/api/workflow/executions/${userId}`);
      return response.data.executions || [];
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      return [];
    }
  }

  async getWorkflowStats() {
    try {
      const response = await this.api.get('/api/workflow/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow stats:', error);
      return {
        total_executions: 0,
        avg_execution_time: 0,
        success_rate: 0
      };
    }
  }

  // Local storage methods for workflow persistence
  saveWorkflowLocally(workflow, name = 'default') {
    try {
      const workflows = this.getLocalWorkflows();
      workflows[name] = {
        ...workflow,
        lastModified: new Date().toISOString(),
        name
      };
      localStorage.setItem('workflows', JSON.stringify(workflows));
      return true;
    } catch (error) {
      console.error('Error saving workflow locally:', error);
      return false;
    }
  }

  getLocalWorkflows() {
    try {
      const workflows = localStorage.getItem('workflows');
      return workflows ? JSON.parse(workflows) : {};
    } catch (error) {
      console.error('Error loading local workflows:', error);
      return {};
    }
  }

  loadWorkflowLocally(name = 'default') {
    try {
      const workflows = this.getLocalWorkflows();
      return workflows[name] || null;
    } catch (error) {
      console.error('Error loading workflow locally:', error);
      return null;
    }
  }

  deleteWorkflowLocally(name) {
    try {
      const workflows = this.getLocalWorkflows();
      delete workflows[name];
      localStorage.setItem('workflows', JSON.stringify(workflows));
      return true;
    } catch (error) {
      console.error('Error deleting workflow locally:', error);
      return false;
    }
  }
}

export const workflowService = new WorkflowService();
