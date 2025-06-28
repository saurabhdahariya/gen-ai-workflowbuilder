import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Workflow Store for managing application state
const useWorkflowStore = create(
  persist(
    (set, get) => ({
      // Current workflow state
      currentWorkflow: {
        id: null,
        name: '',
        description: '',
        nodes: [],
        edges: [],
        isValid: false,
      },

      // Saved workflows (stacks)
      savedWorkflows: [],

      // UI state
      selectedNode: null,
      isRunning: false,
      chatMessages: [],
      showChat: false,

      // Actions
      setCurrentWorkflow: (workflow) =>
        set({ currentWorkflow: workflow }),

      updateWorkflowNodes: (nodes) =>
        set((state) => {
          console.log('🏪 Store: Updating workflow nodes', nodes);
          return {
            currentWorkflow: {
              ...state.currentWorkflow,
              nodes: [...nodes], // Force new array reference
            },
          }
        }),

      updateWorkflowEdges: (edges) =>
        set((state) => {
          // Prevent unnecessary updates if edges are the same
          if (JSON.stringify(state.currentWorkflow.edges) === JSON.stringify(edges)) {
            return state
          }
          return {
            currentWorkflow: {
              ...state.currentWorkflow,
              edges,
            },
          }
        }),

      setSelectedNode: (node) =>
        set({ selectedNode: node }),

      setIsRunning: (isRunning) =>
        set({ isRunning }),

      // Workflow management
      createNewWorkflow: (name, description) => {
        const newWorkflow = {
          id: Date.now().toString(),
          name,
          description,
          nodes: [],
          edges: [],
          isValid: false,
          createdAt: new Date().toISOString(),
        }
        set({ currentWorkflow: newWorkflow })
        return newWorkflow
      },

      saveCurrentWorkflow: () => {
        const { currentWorkflow, savedWorkflows } = get()
        if (!currentWorkflow.id) return

        const updatedWorkflows = savedWorkflows.filter(w => w.id !== currentWorkflow.id)
        updatedWorkflows.push({
          ...currentWorkflow,
          updatedAt: new Date().toISOString(),
        })

        set({ savedWorkflows: updatedWorkflows })
      },

      loadWorkflow: (workflowId) => {
        const { savedWorkflows } = get()
        const workflow = savedWorkflows.find(w => w.id === workflowId)
        if (workflow) {
          set({ currentWorkflow: workflow })
        }
      },

      deleteWorkflow: (workflowId) => {
        const { savedWorkflows } = get()
        const updatedWorkflows = savedWorkflows.filter(w => w.id !== workflowId)
        set({ savedWorkflows: updatedWorkflows })
      },

      // Chat functionality
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),

      clearChatMessages: () =>
        set({ chatMessages: [] }),

      setShowChat: (show) =>
        set({ showChat: show }),

      // Validation
      validateWorkflow: () => {
        const { currentWorkflow } = get()
        const { nodes, edges } = currentWorkflow

        // Check if we have all required nodes
        const hasUserQuery = nodes.some(n => n.type === 'user_query')
        const hasKnowledgeBase = nodes.some(n => n.type === 'knowledge_base')
        const hasLLM = nodes.some(n => n.type === 'llm_engine')
        const hasOutput = nodes.some(n => n.type === 'output')

        // Check if nodes are connected properly
        const isConnected = edges.length >= 3 // Minimum connections for 4 nodes

        const isValid = hasUserQuery && hasKnowledgeBase && hasLLM && hasOutput && isConnected

        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            isValid,
          },
        }))

        return isValid
      },

      // Reset store
      reset: () =>
        set({
          currentWorkflow: {
            id: null,
            name: '',
            description: '',
            nodes: [],
            edges: [],
            isValid: false,
          },
          selectedNode: null,
          isRunning: false,
          chatMessages: [],
          showChat: false,
        }),
    }),
    {
      name: 'workflow-storage',
      partialize: (state) => ({
        savedWorkflows: state.savedWorkflows,
        // Don't persist currentWorkflow to avoid conflicts
      }),
      // Add version for migration if needed
      version: 1,
    }
  )
)

export default useWorkflowStore
