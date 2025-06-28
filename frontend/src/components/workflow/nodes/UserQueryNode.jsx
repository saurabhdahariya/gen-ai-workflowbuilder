import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Tooltip } from '../../ui/tooltip';
import { MessageCircle } from 'lucide-react';

const UserQueryNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [query, setQuery] = useState(data?.config?.query || '');

  // Update node data when query changes
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
                    query: query,
                  },
                },
              }
            : node
        )
      );
    };

    const debounceTimer = setTimeout(updateNodeData, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, id, setNodes]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  return (
    <Card className={`min-w-[280px] max-w-[320px] bg-sky-100 border border-sky-300 rounded-xl shadow-md ${selected ? 'ring-2 ring-sky-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Tooltip content="This component captures user input and starts the workflow">
            <div className="p-1.5 rounded-lg bg-sky-500 text-white shadow-sm">
              <MessageCircle className="w-4 h-4" />
            </div>
          </Tooltip>
          <CardTitle className="text-sm font-semibold text-sky-800">User Query</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Query Input */}
        <div className="space-y-2">
          <Tooltip content="Enter the question or request that will be processed by your workflow">
            <label className="text-xs font-medium text-sky-700 cursor-help">
              Enter User Query
            </label>
          </Tooltip>
          <Input
            type="text"
            placeholder="What would you like to know?"
            value={query}
            onChange={handleQueryChange}
            className="text-sm bg-white border-sky-200 focus:border-sky-400 focus:ring-sky-400"
          />
        </div>

        {/* Status */}
        <div className="bg-sky-50 border border-sky-200 p-2 rounded-lg text-xs">
          <div className="font-medium text-sky-800 mb-1">Status:</div>
          <div className="text-sky-700">
            {query ? `Query: "${query.substring(0, 30)}${query.length > 30 ? '...' : ''}"` : 'No query entered'}
          </div>
        </div>
      </CardContent>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-sky-500 border-2 border-white shadow-sm"
      />
    </Card>
  );
};

export default memo(UserQueryNode);
