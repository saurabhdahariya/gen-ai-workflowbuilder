import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tooltip } from '../components/ui/tooltip';
import { ProgressIndicator } from '../components/ui/progress';
import ComponentLibraryPanel from '../components/workflow/panels/ComponentLibraryPanel';
import { chatService } from '../services/chatService';
import UserQueryNode from '../components/workflow/nodes/UserQueryNode';
import KnowledgeBaseNode from '../components/workflow/nodes/KnowledgeBaseNode';
import LLMEngineNode from '../components/workflow/nodes/LLMEngineNode';
import OutputNode from '../components/workflow/nodes/OutputNode';

import {
  Play,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  X,
  Send,
  ArrowLeft,
  FolderOpen,
  Grid3X3
} from 'lucide-react';

// Node types mapping
const nodeTypes = {
  userQuery: UserQueryNode,
  knowledgeBase: KnowledgeBaseNode,
  llmEngine: LLMEngineNode,
  output: OutputNode,
};

// Load workflow from sessionStorage (session-only) and localStorage (saved)
const loadWorkflowFromStorage = () => {
  try {
    // First try to load from sessionStorage (current session)
    let savedNodes = sessionStorage.getItem('workflowNodes');
    let savedEdges = sessionStorage.getItem('workflowEdges');

    // If no session data, try to load from localStorage (saved workflows)
    if (!savedNodes || !savedEdges) {
      savedNodes = localStorage.getItem('savedWorkflowNodes');
      savedEdges = localStorage.getItem('savedWorkflowEdges');
    }

    return {
      nodes: savedNodes ? JSON.parse(savedNodes) : [],
      edges: savedEdges ? JSON.parse(savedEdges) : []
    };
  } catch (error) {
    console.error('Error loading workflow from storage:', error);
    return { nodes: [], edges: [] };
  }
};

const WorkflowBuilder = () => {
  const navigate = useNavigate();

  // Load saved workflow on mount
  const { nodes: savedNodes, edges: savedEdges } = loadWorkflowFromStorage();

  const [nodes, setNodes, onNodesChange] = useNodesState(savedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isValidWorkflow, setIsValidWorkflow] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(15);
  const [progressData, setProgressData] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // React Flow event handlers
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(type, position);
    },
    [reactFlowInstance]
  );

  const addNode = useCallback((type, position = null) => {
    const id = `${type}-${Date.now()}`;
    const newNode = {
      id,
      type,
      position: position || {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100
      },
      data: {
        label: getNodeLabel(type),
        config: getDefaultConfig(type),
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  // Add delete functionality
  const onNodesDelete = useCallback((nodesToDelete) => {
    setNodes((nds) => nds.filter((node) => !nodesToDelete.find((n) => n.id === node.id)));
    // Also remove any edges connected to deleted nodes
    const deletedNodeIds = nodesToDelete.map(n => n.id);
    setEdges((eds) => eds.filter((edge) =>
      !deletedNodeIds.includes(edge.source) && !deletedNodeIds.includes(edge.target)
    ));
  }, [setNodes, setEdges]);

  const onEdgesDelete = useCallback((edgesToDelete) => {
    setEdges((eds) => eds.filter((edge) => !edgesToDelete.find((e) => e.id === edge.id)));
  }, [setEdges]);

  // Auto-save workflow to sessionStorage (session-only) whenever nodes or edges change
  useEffect(() => {
    // Save to sessionStorage for session persistence
    sessionStorage.setItem('workflowNodes', JSON.stringify(nodes));
    sessionStorage.setItem('workflowEdges', JSON.stringify(edges));
  }, [nodes, edges]);

  // Clear workflow function
  const clearWorkflow = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the entire workflow? This action cannot be undone.')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setIsValidWorkflow(false);
      setShowChat(false);
      setChatMessages([]);

      // Clear session storage (current session)
      sessionStorage.removeItem('workflowNodes');
      sessionStorage.removeItem('workflowEdges');
      sessionStorage.removeItem('currentWorkflow');
    }
  }, [setNodes, setEdges]);

  // Chat functionality
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to chat
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      // Get current workflow
      const currentWorkflow = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        connections: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      };

      // Send message through workflow with progress tracking
      const response = await chatService.sendMessage(userMessage, currentWorkflow, (progress) => {
        setProgressData(progress);
      });

      // Add AI response to chat
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.content,
        sources: response.sources,
        executionTime: response.executionTime,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      // Clear progress after a delay
      setTimeout(() => setProgressData(null), 2000);
    }
  };

  const getNodeLabel = (type) => {
    const labels = {
      userQuery: 'User Query',
      knowledgeBase: 'Knowledge Base',
      llmEngine: 'LLM Engine',
      output: 'Output',
    };
    return labels[type] || 'Unknown';
  };

  const getDefaultConfig = (type) => {
    const configs = {
      userQuery: { placeholder: 'Enter your question...' },
      knowledgeBase: { maxResults: 5, similarityThreshold: 0.7 },
      llmEngine: { 
        model: 'gpt-3.5-turbo', 
        temperature: 0.7, 
        maxTokens: 1000,
        enableWebSearch: false,
        systemPrompt: ''
      },
      output: { format: 'text', showSources: true, enableFollowUp: true },
    };
    return configs[type] || {};
  };

  const updateNodeConfig = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: newData,
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const validateWorkflow = useCallback(() => {
    // Check if workflow has required components
    const hasUserQuery = nodes.some(node => node.type === 'userQuery');
    const hasOutput = nodes.some(node => node.type === 'output');
    const hasConnections = edges.length > 0;
    
    const isValid = hasUserQuery && hasOutput && hasConnections;
    setIsValidWorkflow(isValid);
    return isValid;
  }, [nodes, edges]);



  // Save workflow permanently to localStorage
  const saveWorkflow = useCallback(() => {
    if (nodes.length === 0) {
      alert('Cannot save empty workflow. Please add some components first.');
      return;
    }

    const timestamp = new Date().toISOString();
    const workflowName = prompt('Enter a name for this workflow:', `Workflow_${new Date().toLocaleDateString()}`);

    if (workflowName) {
      // Save to localStorage permanently
      localStorage.setItem('savedWorkflowNodes', JSON.stringify(nodes));
      localStorage.setItem('savedWorkflowEdges', JSON.stringify(edges));
      localStorage.setItem('savedWorkflowMeta', JSON.stringify({
        name: workflowName,
        savedAt: timestamp,
        nodeCount: nodes.length,
        edgeCount: edges.length
      }));

      alert(`✅ Workflow "${workflowName}" saved successfully!\n\nThis workflow will persist across browser sessions.`);
    }
  }, [nodes, edges]);

  // Load saved workflow from localStorage
  const loadSavedWorkflow = useCallback(() => {
    try {
      const savedNodes = localStorage.getItem('savedWorkflowNodes');
      const savedEdges = localStorage.getItem('savedWorkflowEdges');
      const savedMeta = localStorage.getItem('savedWorkflowMeta');

      if (savedNodes && savedEdges) {
        const meta = savedMeta ? JSON.parse(savedMeta) : null;
        const confirmMessage = meta
          ? `Load saved workflow "${meta.name}"?\n\nSaved: ${new Date(meta.savedAt).toLocaleString()}\nComponents: ${meta.nodeCount}\nConnections: ${meta.edgeCount}\n\nThis will replace your current workflow.`
          : 'Load saved workflow? This will replace your current workflow.';

        if (window.confirm(confirmMessage)) {
          setNodes(JSON.parse(savedNodes));
          setEdges(JSON.parse(savedEdges));
          setSelectedNode(null);
          setShowChat(false);
          setChatMessages([]);

          if (meta) {
            alert(`✅ Workflow "${meta.name}" loaded successfully!`);
          } else {
            alert('✅ Saved workflow loaded successfully!');
          }
        }
      } else {
        alert('No saved workflow found.');
      }
    } catch (error) {
      console.error('Error loading saved workflow:', error);
      alert('Error loading saved workflow. Please try again.');
    }
  }, [setNodes, setEdges]);

  const executeWorkflow = useCallback(async () => {
    if (!validateWorkflow()) {
      alert('Please build a valid workflow first. Ensure you have User Query and Output components connected.');
      return;
    }

    setIsBuilding(true);

    try {
      // Convert workflow to backend format
      const nodeTypeMap = {
        'userQuery': 'user_query',
        'knowledgeBase': 'knowledge_base',
        'llmEngine': 'llm_engine',
        'output': 'output'
      };

      const workflowData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: nodeTypeMap[node.type] || node.type,
          position: node.position,
          data: node.data
        })),
        connections: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      };

      // Validate workflow with backend
      const response = await fetch('http://localhost:8000/api/workflow/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData)
      });

      const result = await response.json();

      if (result.valid) {
        // Save workflow to sessionStorage for chat interface (session-only)
        sessionStorage.setItem('currentWorkflow', JSON.stringify(workflowData));

        alert(`✅ Workflow built successfully!\n\n` +
              `• ${result.node_count} components configured\n` +
              `• ${result.connection_count} connections established\n` +
              `• Execution order: ${result.execution_order.join(' → ')}\n\n` +
              `Ready to chat with your AI workflow!`);

        // Show chat interface in the same page
        setShowChat(true);
      } else {
        alert(`❌ Workflow validation failed:\n\n${result.error}\n\nPlease fix the issues and try again.`);
      }
    } catch (error) {
      console.error('Error building workflow:', error);
      alert('❌ Failed to build workflow. Please check your connection and try again.');
    } finally {
      setIsBuilding(false);
    }
  }, [nodes, edges, validateWorkflow, navigate]);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Component Library Panel */}
        <ComponentLibraryPanel onAddNode={addNode} />

        {/* Main Workflow Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="p-3 border-b border-border bg-card flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-base font-semibold text-foreground">Workflow Canvas</h2>
                <div className="flex items-center space-x-2">
                  {isValidWorkflow ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span className="text-xs">Valid</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs">Incomplete</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <Tooltip content="Check if your workflow is properly configured and connected">
                  <Button onClick={validateWorkflow} variant="outline" size="sm" className="text-xs px-2 py-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Validate
                  </Button>
                </Tooltip>

                <Tooltip content="Save your current workflow to browser storage">
                  <Button onClick={saveWorkflow} variant="outline" size="sm" className="text-xs px-2 py-1">
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </Tooltip>

                <Tooltip content="Load a previously saved workflow from storage">
                  <Button onClick={loadSavedWorkflow} variant="outline" size="sm" className="text-xs px-2 py-1">
                    <FolderOpen className="w-3 h-3 mr-1" />
                    Load
                  </Button>
                </Tooltip>

                <Tooltip content="Clear the entire workspace and start fresh">
                  <Button onClick={clearWorkflow} variant="outline" size="sm" className="text-xs px-2 py-1">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </Tooltip>

                {/* Snap to Grid Controls */}
                <div className="flex items-center space-x-1 border-l pl-2 ml-2">
                  <Tooltip content="Toggle snap-to-grid for precise node alignment">
                    <Button
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      variant={snapToGrid ? "default" : "outline"}
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      <Grid3X3 className="w-3 h-3 mr-1" />
                      Grid: {snapToGrid ? 'ON' : 'OFF'}
                    </Button>
                  </Tooltip>

                  {snapToGrid && (
                    <Tooltip content="Adjust grid size for different alignment precision">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground">Size:</span>
                        <select
                          value={gridSize}
                          onChange={(e) => setGridSize(parseInt(e.target.value))}
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                        >
                          <option value={10}>10px</option>
                          <option value={15}>15px</option>
                          <option value={20}>20px</option>
                          <option value={25}>25px</option>
                        </select>
                      </div>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Conditional Rendering */}
          {showChat ? (
            /* Chat Interface */
            <div className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Start chatting with your workflow</h3>
                    <p className="text-sm">Your AI workflow is ready to answer questions and process requests.</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 text-xs opacity-75">
                            Sources: {message.sources.join(', ')}
                          </div>
                        )}
                        {message.executionTime && (
                          <div className="mt-1 text-xs opacity-75">
                            Execution time: {message.executionTime}s
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground rounded-lg p-4 max-w-md">
                      {progressData ? (
                        <ProgressIndicator
                          steps={progressData.steps}
                          currentStep={progressData.currentStep}
                          title="Processing Workflow"
                          className="text-sm"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Processing through workflow...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask your AI workflow anything..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* React Flow Canvas */
            <div className="flex-1 relative overflow-hidden" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid={snapToGrid}
                snapGrid={[gridSize, gridSize]}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                deleteKeyCode={['Backspace', 'Delete']}
                className="w-full h-full"
              >
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    switch (node.type) {
                      case 'userQuery': return '#3b82f6';
                      case 'knowledgeBase': return '#10b981';
                      case 'llmEngine': return '#f59e0b';
                      case 'output': return '#ef4444';
                      default: return '#6b7280';
                    }
                  }}
                  className="bg-background border border-border"
                />
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  className="bg-muted/20"
                />
              </ReactFlow>

              {/* Floating Action Buttons */}
              <div className="absolute bottom-6 right-6 flex flex-col space-y-3 z-10">
                {/* Run Stack Floating Button */}
                <Tooltip content="Build and prepare your workflow for execution">
                  <Button
                    onClick={executeWorkflow}
                    size="lg"
                    disabled={!isValidWorkflow || isBuilding}
                    className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isBuilding ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </Button>
                </Tooltip>

                {/* Chat Floating Button */}
                <Tooltip content="Open chat interface to interact with your AI workflow">
                  <Button
                    onClick={() => setShowChat(true)}
                    variant="secondary"
                    size="lg"
                    disabled={!isValidWorkflow}
                    className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <MessageSquare className="w-6 h-6" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Panel removed - using inline node configuration */}
      </div>
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;
