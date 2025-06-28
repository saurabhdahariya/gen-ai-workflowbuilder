import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import useWorkflowStore from '../store/workflowStore'
import FloatingChatButton from '../components/workflow/FloatingChatButton'

// Import custom node components
import UserQueryNode from '../components/workflow/nodes/UserQueryNode'
import KnowledgeBaseNode from '../components/workflow/nodes/KnowledgeBaseNode'
import LLMEngineNode from '../components/workflow/nodes/LLMEngineNode'
import OutputNode from '../components/workflow/nodes/OutputNode'

// Import sidebar
import ComponentSidebar from '../components/workflow/ComponentSidebar'

// Define custom node types
const nodeTypes = {
  user_query: UserQueryNode,
  knowledge_base: KnowledgeBaseNode,
  llm_engine: LLMEngineNode,
  output: OutputNode,
}

const StackBuilder = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const {
    currentWorkflow,
    loadWorkflow,
    updateWorkflowNodes,
    updateWorkflowEdges,
    saveCurrentWorkflow,
  } = useWorkflowStore()

  // Validate workflow function
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

  const [nodes, setNodes, onNodesChange] = useNodesState(currentWorkflow.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentWorkflow.edges)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  // Load workflow on mount (only when ID changes)
  useEffect(() => {
    if (id && id !== currentWorkflow.id) {
      loadWorkflow(id)
    }
  }, [id]) // Removed dependencies that could cause loops

  // Initialize nodes and edges from workflow (only on workflow load)
  useEffect(() => {
    if (currentWorkflow.id && currentWorkflow.nodes) {
      setNodes(currentWorkflow.nodes || [])
      setEdges(currentWorkflow.edges || [])
    }
  }, [currentWorkflow.id])

  // Update store when nodes/edges change (debounced to prevent loops)
  const updateStoreDebounced = useCallback(() => {
    const timer = setTimeout(() => {
      if (currentWorkflow.id) {
        updateWorkflowNodes(nodes)
        updateWorkflowEdges(edges)
      }
    }, 500) // Longer delay to prevent rapid updates
    return () => clearTimeout(timer)
  }, [nodes, edges, currentWorkflow.id])

  useEffect(() => {
    const cleanup = updateStoreDebounced()
    return cleanup
  }, [updateStoreDebounced])

  // Auto-save workflow (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentWorkflow.id && (nodes.length > 0 || edges.length > 0)) {
        saveCurrentWorkflow()
        validateWorkflow()
      }
    }, 2000) // Increased delay to prevent frequent saves

    return () => clearTimeout(timer)
  }, [nodes, edges]) // Removed dependencies that could cause loops

  const onConnect = useCallback(
    (params) => {
      // Add colorful styling to edges based on source node type
      const sourceNode = nodes.find(node => node.id === params.source)
      let edgeColor = '#6b7280' // default gray

      if (sourceNode) {
        switch (sourceNode.type) {
          case 'user_query':
            edgeColor = '#0ea5e9' // sky-500
            break
          case 'knowledge_base':
            edgeColor = '#22c55e' // green-500
            break
          case 'llm_engine':
            edgeColor = '#a855f7' // purple-500
            break
          case 'output':
            edgeColor = '#64748b' // slate-500
            break
        }
      }

      const newEdge = {
        ...params,
        style: { stroke: edgeColor, strokeWidth: 2 },
        animated: true,
      }

      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, nodes]
  )

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (typeof type === 'undefined' || !type) {
        return
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          config: {},
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const onNodeClick = useCallback((event, node) => {
    // Node selection removed - using inline configuration
    console.log('Node clicked:', node.type)
  }, [])

  const handleSave = () => {
    saveCurrentWorkflow()
    alert('Workflow saved successfully!')
  }

  if (!currentWorkflow.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading workflow...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentWorkflow.name}
              </h1>
              <p className="text-sm text-gray-600">
                {currentWorkflow.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <ComponentSidebar />
        
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              style: { stroke: '#6b7280', strokeWidth: 2 },
              animated: true,
            }}
            connectionLineStyle={{ stroke: '#6b7280', strokeWidth: 2 }}
            fitView
            className="bg-gray-50"
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'user_query': return '#3b82f6'
                  case 'knowledge_base': return '#10b981'
                  case 'llm_engine': return '#8b5cf6'
                  case 'output': return '#6b7280'
                  default: return '#e5e7eb'
                }
              }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Floating Chat Button */}
      <FloatingChatButton nodes={nodes} edges={edges} />
    </div>
  )
}

// Wrap with ReactFlowProvider
const StackBuilderWithProvider = () => (
  <ReactFlowProvider>
    <StackBuilder />
  </ReactFlowProvider>
)

export default StackBuilderWithProvider
