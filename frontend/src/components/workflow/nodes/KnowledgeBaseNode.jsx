import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Database, FileText, Upload, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { uploadDocument, generateEmbeddings } from '../../../lib/api';

const KnowledgeBaseNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [documentId, setDocumentId] = useState(null)
  const [embeddingStatus, setEmbeddingStatus] = useState('none') // 'none', 'generating', 'ready', 'error'
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

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
                    documentId,
                    fileName,
                    extractedText,
                    embeddingStatus,
                    documentCount: fileName ? 1 : 0,
                    embeddingsReady: embeddingStatus === 'ready'
                  },
                },
              }
            : node
        )
      );
    };

    const debounceTimer = setTimeout(updateNodeData, 300);
    return () => clearTimeout(debounceTimer);
  }, [documentId, fileName, extractedText, embeddingStatus, id, setNodes]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFileName(file.name)
    setUploading(true)
    setError('')
    setExtractedText('')

    try {
      console.log('📤 Uploading file:', file.name)
      const response = await uploadDocument(file)

      setDocumentId(response.id)
      setExtractedText(response.extracted_text || '')
      setUploading(false)

      console.log('✅ Upload successful!')
      console.log('📄 Extracted text preview:', response.extracted_text?.substring(0, 200) + '...')

      // Store in node data for persistence
      if (data.updateNodeData) {
        data.updateNodeData({
          ...data.config,
          documentId: response.id,
          fileName: file.name,
          extractedText: response.extracted_text,
          documentCount: 1
        })
      }

    } catch (err) {
      console.error('❌ Upload failed:', err)
      setError(err.message || 'Upload failed')
      setUploading(false)
      setFileName('')
    }
  }

  const handleGenerateEmbeddings = async () => {
    if (!documentId) return

    setEmbeddingStatus('generating')
    setError('')

    try {
      console.log('🧠 Generating embeddings for document:', documentId)
      const response = await generateEmbeddings(documentId, 500, 100)

      setEmbeddingStatus('ready')
      console.log('✅ Embeddings generated successfully!')
      console.log('📊 Embedding stats:', response)

      // Update node data
      if (data.updateNodeData) {
        data.updateNodeData({
          ...data.config,
          embeddingsReady: true,
          embeddingCount: response.chunks_processed || 0
        })
      }

    } catch (err) {
      console.error('❌ Embedding generation failed:', err)
      setError(err.message || 'Embedding generation failed')
      setEmbeddingStatus('error')
    }
  }

  const handleClearDocument = () => {
    setFileName('')
    setExtractedText('')
    setDocumentId(null)
    setEmbeddingStatus('none')
    setError('')

    if (data.updateNodeData) {
      data.updateNodeData({
        ...data.config,
        documentId: null,
        fileName: '',
        extractedText: '',
        documentCount: 0,
        embeddingsReady: false
      })
    }
  }



  const getStatusIcon = () => {
    if (uploading) return <Loader2 className="w-3 h-3 animate-spin" />
    if (embeddingStatus === 'ready') return <CheckCircle className="w-3 h-3 text-green-500" />
    if (embeddingStatus === 'generating') return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
    if (error) return <AlertCircle className="w-3 h-3 text-red-500" />
    if (fileName) return <FileText className="w-3 h-3 text-blue-500" />
    return <Database className="w-4 h-4" />
  }

  return (
    <Card className={`min-w-[280px] max-w-[320px] bg-green-100 border border-green-300 rounded-xl shadow-md ${selected ? 'ring-2 ring-green-500' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-green-500 text-white shadow-sm">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-sm font-semibold text-green-800">Knowledge Base</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* File Upload Section */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-green-700">Document Upload</div>

          {!fileName ? (
            <div className="border-2 border-dashed border-green-300 rounded-lg p-3 text-center bg-green-50">
              <Upload className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-green-600 mb-2">Upload PDF document</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 mr-1" />
                    Choose File
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs text-green-800 truncate">{fileName}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearDocument}
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {extractedText && (
                <div className="mt-2 p-2 bg-white rounded text-xs">
                  <div className="font-medium text-gray-700 mb-1">Extracted Text Preview:</div>
                  <div className="text-gray-600 max-h-16 overflow-y-auto">
                    {extractedText.substring(0, 150)}
                    {extractedText.length > 150 && '...'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Embeddings Section */}
        {fileName && extractedText && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Vector Embeddings</div>
            <Button
              size="sm"
              onClick={handleGenerateEmbeddings}
              disabled={embeddingStatus === 'generating' || embeddingStatus === 'ready'}
              className="w-full text-xs h-7"
              variant={embeddingStatus === 'ready' ? 'default' : 'outline'}
            >
              {embeddingStatus === 'generating' ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : embeddingStatus === 'ready' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </>
              ) : (
                'Generate Embeddings'
              )}
            </Button>


          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="bg-green-50 border border-green-200 p-2 rounded-lg text-xs">
          <div className="font-medium text-green-800 mb-1">Status:</div>
          <div className="space-y-1 text-green-700">
            <div>Documents: {fileName ? 1 : 0}</div>
            <div>Max Results: {data.config?.maxResults || 5}</div>
            <div>Embeddings: {embeddingStatus === 'ready' ? 'Ready' : 'Not Ready'}</div>
          </div>
        </div>
      </CardContent>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="query"
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-sm"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="context"
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-sm"
      />
    </Card>
  );
};

export default memo(KnowledgeBaseNode);
