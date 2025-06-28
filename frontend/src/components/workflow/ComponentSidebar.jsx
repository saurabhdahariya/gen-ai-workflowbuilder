import React from 'react'
import { User, Database, Brain, FileOutput } from 'lucide-react'

const components = [
  {
    type: 'user_query',
    label: 'User Query',
    icon: User,
    color: 'bg-blue-500',
    description: 'Input for user questions',
  },
  {
    type: 'knowledge_base',
    label: 'Knowledge Base',
    icon: Database,
    color: 'bg-green-500',
    description: 'PDF documents and embeddings',
  },
  {
    type: 'llm_engine',
    label: 'LLM Engine',
    icon: Brain,
    color: 'bg-purple-500',
    description: 'AI language model processing',
  },
  {
    type: 'output',
    label: 'Output',
    icon: FileOutput,
    color: 'bg-gray-500',
    description: 'Final response display',
  },
]

const ComponentSidebar = () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Components</h3>
        <p className="text-sm text-gray-600">
          Drag components onto the canvas to build your workflow
        </p>
      </div>
      
      <div className="space-y-3">
        {components.map((component) => {
          const IconComponent = component.icon
          
          return (
            <div
              key={component.type}
              className="group cursor-move bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 transition-colors"
              draggable
              onDragStart={(event) => onDragStart(event, component.type)}
            >
              <div className="flex items-start space-x-3">
                <div className={`${component.color} p-2 rounded-md text-white flex-shrink-0`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                    {component.label}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {component.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-8 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Tips</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Connect components in order</li>
          <li>• Configure each component</li>
          <li>• Test with "Run Stack"</li>
          <li>• Use "Chat" for quick testing</li>
        </ul>
      </div>
    </div>
  )
}

export default ComponentSidebar
