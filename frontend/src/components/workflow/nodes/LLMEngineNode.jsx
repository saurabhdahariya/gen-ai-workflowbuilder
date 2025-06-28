import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Brain, Eye, EyeOff, Search } from 'lucide-react';

const LLMEngineNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [apiKey, setApiKey] = useState(data?.config?.apiKey || '');
  const [model, setModel] = useState(data?.config?.model || 'gpt-3.5-turbo');
  const [prompt, setPrompt] = useState(data?.config?.prompt || '');
  const [temperature, setTemperature] = useState(data?.config?.temperature || 0.7);
  const [enableWebSearch, setEnableWebSearch] = useState(data?.config?.enableWebSearch || false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Update node data when any config changes
  useEffect(() => {
    const updateNodeData = () => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: {
                    ...node.data.config,
                    apiKey,
                    model,
                    prompt,
                    temperature,
                    enableWebSearch,
                  },
                },
              }
            : node
        )
      );
    };

    const debounceTimer = setTimeout(updateNodeData, 300);
    return () => clearTimeout(debounceTimer);
  }, [apiKey, model, prompt, temperature, enableWebSearch, id, setNodes]);

  return (
    <Card className={`min-w-[320px] max-w-[380px] bg-purple-100 border border-purple-300 rounded-xl shadow-md ${selected ? 'ring-2 ring-purple-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-purple-500 text-white shadow-sm">
            <Brain className="w-4 h-4" />
          </div>
          <CardTitle className="text-sm font-semibold text-purple-800">LLM Engine</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-purple-700">
            API Key
          </label>
          <div className="relative">
            <Input
              type={showApiKey ? "text" : "password"}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-sm pr-10 bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-purple-700">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-purple-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-purple-700">
            System Prompt
          </label>
          <Textarea
            placeholder="You are a helpful AI assistant..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-sm resize-none bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
            rows={3}
          />
        </div>

        {/* Temperature Slider */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-purple-700">
            Temperature: {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(temperature / 2) * 100}%, #e9d5ff ${(temperature / 2) * 100}%, #e9d5ff 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-purple-600">
            <span>Focused</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Web Search Toggle */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableWebSearch}
              onChange={(e) => setEnableWebSearch(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-purple-100 border-purple-300 rounded focus:ring-purple-500 focus:ring-2"
            />
            <div className="flex items-center space-x-1">
              <Search className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Enable Web Search</span>
            </div>
          </label>
          {enableWebSearch && (
            <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded border border-purple-200">
              <div className="flex items-center space-x-1">
                <Search className="w-3 h-3" />
                <span>Will search the web for additional context</span>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg text-xs">
          <div className="font-medium text-purple-800 mb-1">Configuration:</div>
          <div className="text-purple-700 space-y-1">
            <div>Model: {model}</div>
            <div>Temperature: {temperature}</div>
            <div>API Key: {apiKey ? '••••••••' : 'Not set'}</div>
            <div className="flex items-center space-x-1">
              <Search className="w-3 h-3" />
              <span>Web Search: {enableWebSearch ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="query"
        style={{ top: '30%' }}
        className="w-3 h-3 bg-purple-500 border-2 border-white shadow-sm"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="context"
        style={{ top: '70%' }}
        className="w-3 h-3 bg-purple-500 border-2 border-white shadow-sm"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="response"
        className="w-3 h-3 bg-purple-500 border-2 border-white shadow-sm"
      />
    </Card>
  );
};

export default memo(LLMEngineNode);
