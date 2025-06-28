import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Calendar, Layers } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import CreateStackModal from '../components/modals/CreateStackModal'
import useWorkflowStore from '../store/workflowStore'

const Dashboard = () => {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { savedWorkflows, deleteWorkflow } = useWorkflowStore()

  const handleCreateStack = (name, description) => {
    const { createNewWorkflow } = useWorkflowStore.getState()
    const newWorkflow = createNewWorkflow(name, description)
    setShowCreateModal(false)
    navigate(`/stack/${newWorkflow.id}`)
  }

  const handleEditStack = (stackId) => {
    navigate(`/stack/${stackId}`)
  }

  const handleDeleteStack = (stackId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this stack?')) {
      deleteWorkflow(stackId)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GenAI Workflow Builder</h1>
              <p className="text-gray-600 mt-1">Create and manage your AI workflow stacks</p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Stack
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {savedWorkflows.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stacks yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get started by creating your first AI workflow stack. Combine components like 
              User Query, Knowledge Base, LLM Engine, and Output to build powerful workflows.
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Stack
            </Button>
          </div>
        ) : (
          // Stacks Grid
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Stacks ({savedWorkflows.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedWorkflows.map((workflow) => (
                <Card 
                  key={workflow.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleEditStack(workflow.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {workflow.name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {workflow.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteStack(workflow.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Layers className="w-4 h-4 mr-1" />
                        <span>{workflow.nodes?.length || 0} components</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>
                          {workflow.updatedAt 
                            ? formatDate(workflow.updatedAt)
                            : formatDate(workflow.createdAt)
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {workflow.isValid ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Incomplete
                          </span>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditStack(workflow.id)
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Stack Modal */}
      <CreateStackModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateStack}
      />
    </div>
  )
}

export default Dashboard
