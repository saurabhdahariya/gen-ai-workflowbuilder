import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Send, Bot, User, Loader2, FileText, Zap } from 'lucide-react';
import { chatService } from '../services/chatService';

const ChatUI = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI assistant powered by the workflow you\'ve built. How can I help you today?',
      timestamp: new Date(),
      followUpQuestions: [
        'What can you help me with?',
        'How does this workflow work?',
        'Tell me about artificial intelligence'
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Get workflow from localStorage (set by WorkflowBuilder)
  const [currentWorkflow, setCurrentWorkflow] = useState(() => {
    const savedWorkflow = localStorage.getItem('currentWorkflow');
    if (savedWorkflow) {
      try {
        return JSON.parse(savedWorkflow);
      } catch (error) {
        console.error('Error parsing saved workflow:', error);
      }
    }

    // Default workflow if none saved
    return {
      nodes: [
        { id: '1', type: 'user_query', position: { x: 100, y: 100 }, data: { config: { placeholder: 'Ask me anything...' } } },
        { id: '2', type: 'llm_engine', position: { x: 200, y: 100 }, data: { config: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 1000, enableWebSearch: false } } },
        { id: '3', type: 'output', position: { x: 300, y: 100 }, data: { config: { format: 'text', showSources: true } } }
      ],
      connections: [
        { source: '1', target: '2' },
        { source: '2', target: '3' }
      ]
    };
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Execute workflow with current configuration
      const response = await chatService.sendMessage(inputMessage, currentWorkflow);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.content,
        sources: response.sources,
        timestamp: new Date(),
        followUpQuestions: generateFollowUpQuestions(response.content)
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        isError: true,
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

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const generateFollowUpQuestions = (response) => {
    // Generate contextual follow-up questions based on the response
    const questions = [];

    if (response.toLowerCase().includes('artificial intelligence') || response.toLowerCase().includes('ai')) {
      questions.push('How is AI being used in different industries?', 'What are the ethical considerations of AI?');
    }

    if (response.toLowerCase().includes('machine learning')) {
      questions.push('What are the different types of machine learning?', 'How does deep learning work?');
    }

    if (response.toLowerCase().includes('data')) {
      questions.push('How is data processed in this workflow?', 'What types of data can be analyzed?');
    }

    // Default questions if no specific context
    if (questions.length === 0) {
      questions.push('Can you explain this in more detail?', 'What are some related topics?', 'How can I learn more about this?');
    }

    return questions.slice(0, 3); // Limit to 3 questions
  };

  const handleFollowUpClick = (question) => {
    setInputMessage(question);
    handleSendMessage();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
                <p className="text-sm text-muted-foreground">
                  Powered by your custom workflow
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.isError
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted text-muted-foreground'
                } rounded-lg p-3 shadow-sm`}
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 mt-0.5" />
                    ) : (
                      <Bot className="w-4 h-4 mt-0.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <p className="text-xs opacity-75 mb-1">Sources:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs opacity-75">
                              <FileText className="w-3 h-3" />
                              <span>{source}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.type === 'bot' && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/20">
                        <p className="text-xs opacity-75 mb-2">Follow-up questions:</p>
                        <div className="space-y-1">
                          {message.followUpQuestions.map((question, index) => (
                            <button
                              key={index}
                              onClick={() => handleFollowUpClick(question)}
                              className="block w-full text-left text-xs p-2 rounded bg-background/50 hover:bg-background/80 transition-colors opacity-75 hover:opacity-100"
                              disabled={isLoading}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs opacity-50 mt-1">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg p-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Workflow Info Sidebar */}
      <div className="w-80 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Active Workflow</h3>
          <p className="text-sm text-muted-foreground">
            Current AI processing pipeline
          </p>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {currentWorkflow.nodes.map((node, index) => (
              <Card key={node.id} className="bg-background">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <CardTitle className="text-sm">
                      {node.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground">
                    {node.data?.config && Object.entries(node.data.config).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key}:</span>
                        <span className="truncate ml-2">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-border">
          <Button variant="outline" size="sm" className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Modify Workflow
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;
