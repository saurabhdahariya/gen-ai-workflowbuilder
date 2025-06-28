import React, { useState } from 'react';
import { MessageSquare, Send, X, Loader2, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useReactFlow } from 'reactflow';
import useWorkflowStore from '../../store/workflowStore';

const FloatingChatButton = ({ nodes: propNodes, edges: propEdges }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Get React Flow functions and workflow store
  const { setNodes: setReactFlowNodes } = useReactFlow();
  const { updateWorkflowNodes, currentWorkflow } = useWorkflowStore();

  // Use store nodes if available, fallback to props
  const nodes = currentWorkflow?.nodes || propNodes || [];
  const edges = currentWorkflow?.edges || propEdges || [];

  // Validate workflow
  const validateWorkflow = () => {
    if (!nodes || nodes.length === 0) return false;

    // Check for required node types
    const hasUserQuery = nodes.some(node => node.type === 'user_query');
    const hasLLM = nodes.some(node => node.type === 'llm_engine');
    const hasOutput = nodes.some(node => node.type === 'output');

    // Check for connections
    const hasConnections = edges && edges.length > 0;

    return hasUserQuery && hasLLM && hasOutput && hasConnections;
  };

  // Handle workflow execution
  const handleRunWorkflow = async () => {
    setIsRunning(true);

    try {
      // First validate the workflow
      const validation = validateWorkflowDetailed();

      if (!validation.isValid) {
        alert(`❌ Workflow validation failed:\n\n${validation.errors.join('\n')}\n\nPlease fix these issues before running the workflow.`);
        return;
      }

      // Get the user query from User Query node
      const userQueryNode = nodes.find(node => node.type === 'user_query');
      const userQuery = userQueryNode?.data?.config?.query;

      if (!userQuery || userQuery.trim() === '') {
        alert('❌ Please enter a query in the User Query node before running the workflow.');
        return;
      }

      // Execute the workflow
      await executeWorkflowAndUpdateOutput(userQuery);

    } catch (error) {
      console.error('Error running workflow:', error);
      alert(`Error running workflow: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Execute workflow and update output node
  const executeWorkflowAndUpdateOutput = async (userQuery) => {
    try {
      // Convert workflow to backend format
      const workflow = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data || { config: {} }
        })),
        connections: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      };

      const response = await fetch('http://localhost:8000/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'workflow-user',
          query: userQuery,
          workflow: workflow
        }),
      });

      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.status}`);
      }

      const result = await response.json();

      // Update the Output node with the response
      updateOutputNode(result.response || 'No response generated');

      alert(`✅ Workflow executed successfully!\n\nQuery: "${userQuery}"\nResponse updated in Output node.`);

    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  };

  // Update Output node with the response
  const updateOutputNode = (response) => {
    console.log('🔄 Updating Output node with response:', response);

    // Use current workflow nodes from store
    const currentNodes = currentWorkflow?.nodes || nodes;
    const outputNode = currentNodes.find(node => node.type === 'output');

    if (outputNode) {
      console.log('📄 Found Output node:', outputNode.id);

      const updatedNodes = currentNodes.map(node => {
        if (node.id === outputNode.id) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              config: {
                ...node.data?.config,
                response: response,
                lastUpdated: new Date().toISOString(),
                status: 'completed'
              }
            }
          };
          console.log('✅ Updated Output node data:', updatedNode.data);
          return updatedNode;
        }
        return node;
      });

      // Update both React Flow and store
      console.log('🔄 Updating React Flow nodes directly');
      setReactFlowNodes(updatedNodes);

      console.log('💾 Updating store nodes');
      updateWorkflowNodes(updatedNodes);

      console.log('✅ Output node updated successfully');
    } else {
      console.error('❌ Output node not found');
    }
  };

  // Enhanced workflow validation function
  const validateWorkflowDetailed = () => {
    const errors = [];
    const warnings = [];

    // Check if workflow has nodes
    if (!nodes || nodes.length === 0) {
      errors.push('• No nodes found in workflow');
      return { isValid: false, errors, warnings, summary: '' };
    }

    // Check for required node types
    const userQueryNodes = nodes.filter(node => node.type === 'user_query');
    const knowledgeBaseNodes = nodes.filter(node => node.type === 'knowledge_base');
    const llmNodes = nodes.filter(node => node.type === 'llm_engine');
    const outputNodes = nodes.filter(node => node.type === 'output');

    if (userQueryNodes.length === 0) {
      errors.push('• Missing User Query node');
    }
    if (llmNodes.length === 0) {
      errors.push('• Missing LLM Engine node');
    }
    if (outputNodes.length === 0) {
      errors.push('• Missing Output node');
    }

    // Check for connections
    if (!edges || edges.length === 0) {
      errors.push('• No connections between nodes');
    }

    // Check node configurations
    knowledgeBaseNodes.forEach((node, index) => {
      const config = node.data?.config || {};
      if (!config.selectedDocuments || config.selectedDocuments.length === 0) {
        warnings.push(`• Knowledge Base node ${index + 1}: No documents selected`);
      }
    });

    llmNodes.forEach((node, index) => {
      const config = node.data?.config || {};
      if (!config.apiKey) {
        errors.push(`• LLM Engine node ${index + 1}: Missing API key`);
      }
      if (!config.model) {
        warnings.push(`• LLM Engine node ${index + 1}: No model selected (will use default)`);
      }
    });

    // Check workflow connectivity
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const unconnectedNodes = nodes.filter(node => !connectedNodes.has(node.id));
    if (unconnectedNodes.length > 0) {
      warnings.push(`• ${unconnectedNodes.length} unconnected nodes found`);
    }

    // Generate summary
    const isValid = errors.length === 0;
    let summary = '';

    if (isValid) {
      summary = `Workflow Structure:
• ${userQueryNodes.length} User Query node(s)
• ${knowledgeBaseNodes.length} Knowledge Base node(s)
• ${llmNodes.length} LLM Engine node(s)
• ${outputNodes.length} Output node(s)
• ${edges.length} connection(s)`;

      if (warnings.length > 0) {
        summary += `\n\nWarnings:\n${warnings.join('\n')}`;
      }
    }

    return {
      isValid,
      errors,
      warnings,
      summary
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare workflow data
      const workflowData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data || {}
        })),
        connections: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      };

      // Execute workflow via API
      const response = await fetch('http://localhost:8000/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'chat-user',
          query: userMessage.content,
          workflow: workflowData
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const result = await response.json();

      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: result.response || 'No response received',
        timestamp: new Date().toISOString(),
        executionTime: result.execution_time_ms,
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
        {/* Run Workflow Button */}
        <Button
          onClick={handleRunWorkflow}
          disabled={isRunning || !validateWorkflow()}
          className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 shadow-lg p-0 transition-all duration-200"
          size="sm"
          title="Run Workflow"
        >
          {isRunning ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Play className="h-5 w-5 text-white" />
          )}
        </Button>

        {/* Chat Button */}
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg p-0 transition-all duration-200"
          size="sm"
          title="Chat with Workflow"
        >
          <MessageSquare className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Enhanced Chat Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] w-[95vw] flex flex-col p-0 gap-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <DialogHeader className="p-6 border-b bg-white/80 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-gray-800">Chat with Workflow</DialogTitle>
                  <p className="text-sm text-gray-500">Ask questions about your workflow</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={validateWorkflow() ? "default" : "secondary"} className="text-xs">
                  {validateWorkflow() ? "Ready" : "Setup Required"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Enhanced Messages Area with Better Scrolling */}
          <div className="flex-1 overflow-hidden bg-white/50">
            <ScrollArea className="h-[450px] w-full">
              <div className="p-6 space-y-4 min-h-[450px]">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-4 shadow-sm">
                      <MessageSquare className="h-12 w-12 mx-auto text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Start a conversation!</h3>
                    <p className="text-sm text-gray-500 mb-4">Ask questions about your workflow or uploaded documents.</p>
                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-600 max-w-sm mx-auto">
                      <p className="font-medium mb-1">💡 Try asking:</p>
                      <p>"What is my name?"</p>
                      <p>"Summarize the document"</p>
                      <p>"What are my skills?"</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : message.type === 'error'
                            ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-md'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</div>
                        <div className={`text-xs mt-2 flex items-center justify-between ${
                          message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          <span>{new Date(message.timestamp || Date.now()).toLocaleTimeString()}</span>
                          {message.executionTime && (
                            <span className="ml-2">⚡ {message.executionTime}ms</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Enhanced Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-500">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Enhanced Input Area */}
          <div className="p-6 border-t bg-white/80 backdrop-blur-sm flex-shrink-0">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your workflow or documents..."
                  disabled={isLoading}
                  className="w-full pr-12 py-3 text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-xl"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                  {inputMessage.length}/500
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex-shrink-0 transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Quick suggestions */}
            {messages.length === 0 && !isLoading && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setInputMessage("What is my name?")}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                >
                  What is my name?
                </button>
                <button
                  onClick={() => setInputMessage("Summarize the document")}
                  className="px-3 py-1 text-xs bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                >
                  Summarize document
                </button>
                <button
                  onClick={() => setInputMessage("What are my skills?")}
                  className="px-3 py-1 text-xs bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                >
                  What are my skills?
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingChatButton;
