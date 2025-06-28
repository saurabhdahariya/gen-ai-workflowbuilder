import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import useWorkflowStore from '../../store/workflowStore'

const ChatModal = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  
  const {
    chatMessages,
    addChatMessage,
    clearChatMessages,
    currentWorkflow,
    validateWorkflow,
  } = useWorkflowStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    // Validate workflow has all required node types
    const nodeTypes = currentWorkflow.nodes.map(n => n.type)
    const requiredTypes = ['user_query', 'knowledge_base', 'llm_engine', 'output']
    const hasAllTypes = requiredTypes.every(type => nodeTypes.includes(type))

    if (!hasAllTypes) {
      addChatMessage({
        id: Date.now(),
        type: 'system',
        content: 'Please add all required components: User Query, Knowledge Base, LLM Engine, and Output nodes.',
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Validate workflow has connections
    if (currentWorkflow.edges.length < 3) {
      addChatMessage({
        id: Date.now(),
        type: 'system',
        content: 'Please connect your workflow components before chatting.',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    }

    addChatMessage(userMessage)
    setMessage('')
    setIsLoading(true)

    try {
      // Format workflow data for backend API
      const workflowData = {
        nodes: currentWorkflow.nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position || { x: 0, y: 0 },
          data: node.data || {}
        })),
        connections: currentWorkflow.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null
        }))
      }

      // Execute workflow via direct API call
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
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Request failed: ${response.status}`)
      }

      const data = await response.json()

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.response || 'I received your message but couldn\'t generate a response.',
        timestamp: new Date().toISOString(),
        executionTime: data.execution_time_ms,
      }

      addChatMessage(botMessage)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      }
      addChatMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-2xl mx-4 h-[600px] bg-white flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="text-xl font-semibold flex items-center">
            <Bot className="w-5 h-5 mr-2 text-blue-600" />
            Chat with {currentWorkflow.name || 'Stack'}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearChatMessages}
              disabled={chatMessages.length === 0}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Ask questions and test your workflow. I'll use the components 
                  you've configured to provide responses.
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-lg px-4 py-2 
                      ${msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : msg.type === 'system'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-gray-100 text-gray-900'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-2">
                      {msg.type !== 'user' && (
                        <div className="flex-shrink-0 mt-1">
                          {msg.type === 'system' ? (
                            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                              <span className="text-xs text-white">!</span>
                            </div>
                          ) : (
                            <Bot className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`
                            text-xs 
                            ${msg.type === 'user' ? 'text-blue-200' : 'text-gray-500'}
                          `}>
                            {formatTime(msg.timestamp)}
                          </span>
                          {msg.executionTime && (
                            <span className="text-xs text-gray-500">
                              {msg.executionTime}ms
                            </span>
                          )}
                        </div>
                      </div>
                      {msg.type === 'user' && (
                        <User className="w-5 h-5 text-blue-200 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={1}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChatModal
