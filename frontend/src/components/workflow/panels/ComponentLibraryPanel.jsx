import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { 
  MessageCircle, 
  Database, 
  Brain, 
  Monitor,
  Plus,
  Info
} from 'lucide-react';

const ComponentLibraryPanel = ({ onAddNode }) => {
  const nodeTypes = [
    {
      type: 'userQuery',
      label: 'User Query',
      description: 'Entry point for user questions. Accepts user queries and serves as the workflow starting point.',
      icon: MessageCircle,
      color: 'bg-blue-500',
      category: 'Input'
    },
    {
      type: 'knowledgeBase',
      label: 'Knowledge Base',
      description: 'Upload and process documents (PDFs). Extracts text, generates embeddings, and retrieves relevant context.',
      icon: Database,
      color: 'bg-green-500',
      category: 'Processing'
    },
    {
      type: 'llmEngine',
      label: 'LLM Engine',
      description: 'AI model for generating responses. Accepts queries and context, optionally uses web search.',
      icon: Brain,
      color: 'bg-yellow-500',
      category: 'AI'
    },
    {
      type: 'output',
      label: 'Output',
      description: 'Display final AI response. Functions as chat interface with support for follow-up questions.',
      icon: Monitor,
      color: 'bg-red-500',
      category: 'Output'
    },
  ];

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-72 bg-background border-r border-border flex flex-col shadow-lg flex-shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Components</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Drag to canvas to build workflow
        </p>
      </div>

      {/* Component List */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <div className="space-y-2">
          {nodeTypes.map((nodeType) => {
            const Icon = nodeType.icon;

            return (
              <Card
                key={nodeType.type}
                className="cursor-grab hover:shadow-md transition-all duration-200 hover:scale-[1.01]"
                draggable
                onDragStart={(event) => onDragStart(event, nodeType.type)}
                onClick={() => onAddNode && onAddNode(nodeType.type)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <div className={`p-1.5 rounded-lg ${nodeType.color} text-white flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <h3 className="font-medium text-foreground text-xs">
                          {nodeType.label}
                        </h3>
                        <span className="text-xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                          {nodeType.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                        {nodeType.description}
                      </p>
                    </div>
                    <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-4 p-2 bg-muted/50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Quick Tips:</div>
              <ul className="space-y-0.5 text-xs">
                <li>• Drag components to canvas</li>
                <li>• Connect with arrows</li>
                <li>• Configure settings inline</li>
                <li>• Use floating buttons to run</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Stats */}
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Available Components</span>
            <span className="font-medium">{nodeTypes.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentLibraryPanel;
