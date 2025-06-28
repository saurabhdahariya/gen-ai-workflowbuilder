import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Monitor, Copy, CheckCircle, Sparkles } from 'lucide-react';

const OutputNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [response, setResponse] = useState(data?.config?.response || '');
  const [showSources, setShowSources] = useState(data?.config?.showSources || false);
  const [copied, setCopied] = useState(false);

  // Update local state when data prop changes (from workflow execution)
  useEffect(() => {
    console.log('🔄 OutputNode data changed:', data);
    if (data?.config?.response !== undefined) {
      console.log('📝 Setting response:', data.config.response);
      setResponse(data.config.response);
    }
    if (data?.config?.showSources !== undefined) {
      setShowSources(data.config.showSources);
    }
  }, [data?.config?.response, data?.config?.showSources]);

  // Update node data when config changes
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
                    response,
                    showSources,
                  },
                },
              }
            : node
        )
      );
    };

    const debounceTimer = setTimeout(updateNodeData, 300);
    return () => clearTimeout(debounceTimer);
  }, [response, showSources, id, setNodes]);

  const handleCopy = async () => {
    if (response) {
      try {
        await navigator.clipboard.writeText(response);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <Card className={`min-w-[300px] max-w-[350px] bg-slate-100 border border-slate-300 rounded-xl shadow-md ${selected ? 'ring-2 ring-slate-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-slate-500 text-white shadow-sm">
              <Monitor className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-800">Output</CardTitle>
          </div>
          {response && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0 text-slate-600 hover:text-slate-800"
            >
              {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Output Display Area */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">
            Generated Response
          </label>

          {response ? (
            <div className="bg-white border border-slate-200 rounded-lg p-3 min-h-[120px] text-sm text-slate-800">
              {response}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center text-center">
              <Sparkles className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 font-medium mb-1">
                Output will be generated based on query
              </p>
              <p className="text-xs text-slate-500">
                Connect your workflow and run it to see results here
              </p>
            </div>
          )}
        </div>

        {/* Configuration Options */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`showSources-${id}`}
              checked={showSources}
              onChange={(e) => setShowSources(e.target.checked)}
              className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            />
            <label htmlFor={`showSources-${id}`} className="text-xs text-slate-700">
              Show source references
            </label>
          </div>
        </div>

        {/* Status */}
        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs">
          <div className="font-medium text-slate-800 mb-1">Status:</div>
          <div className="text-slate-700">
            {response ? (
              <div className="text-green-600">✓ Response ready ({response.length} characters)</div>
            ) : (
              <div className="text-slate-500">⏳ Waiting for workflow execution</div>
            )}
            {data?.config?.lastUpdated && (
              <div className="text-slate-400 mt-1">
                Last updated: {new Date(data.config.lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="response"
        className="w-3 h-3 bg-slate-500 border-2 border-white shadow-sm"
      />
    </Card>
  );
};

export default memo(OutputNode);
