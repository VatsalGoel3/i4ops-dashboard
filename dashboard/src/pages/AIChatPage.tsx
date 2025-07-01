import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '../lib/config';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  model?: string;
  metadata?: {
    duration: number;
    totalDuration?: number;
    evalCount?: number;
  };
}

interface ModelInfo {
  name: string;
  size: number;
  modified: string;
}

const AVAILABLE_MODELS = {
  'i4cybersecv2': 'Cybersecurity v2',
  'i4compliance1': 'Compliance v1', 
  'llama3': 'Llama 3',
  'i4cybersecv1': 'Cybersecurity v1'
} as const;

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<keyof typeof AVAILABLE_MODELS>('i4cybersecv2');
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [modelInfo, setModelInfo] = useState<ModelInfo[]>([]);
  const [aiServiceHealth, setAiServiceHealth] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check AI service health and load models on mount
  useEffect(() => {
    checkAIHealth();
    loadModels();
  }, []);

  const checkAIHealth = async () => {
    try {
      setAiServiceHealth('checking');
      const response = await fetch(`${config.api.baseUrl}/ai-chat/health`);
      const data = await response.json();
      setAiServiceHealth(data.status === 'healthy' ? 'healthy' : 'unhealthy');
    } catch (error) {
      setAiServiceHealth('unhealthy');
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/ai-chat/models`);
      const data = await response.json();
      setModelInfo(data.ollamaModels || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const sendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: message,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${config.api.baseUrl}/ai-chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          model: selectedModel,
          conversationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        model: data.model,
        metadata: data.metadata
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to AI service'}`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = async () => {
    try {
      await fetch(`${config.api.baseUrl}/ai-chat/conversation/${conversationId}`, {
        method: 'DELETE'
      });
      setMessages([]);
      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      toast.error('Failed to clear conversation');
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const getModelDisplayName = (modelKey: string) => {
    return AVAILABLE_MODELS[modelKey as keyof typeof AVAILABLE_MODELS] || modelKey;
  };

  const getHealthStatusColor = () => {
    switch (aiServiceHealth) {
      case 'healthy': return 'text-green-600';
      case 'unhealthy': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = () => {
    switch (aiServiceHealth) {
      case 'healthy': return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'unhealthy': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'checking': return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
            <p className="text-sm text-gray-600">Chat with specialized AI models for cybersecurity and compliance</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* AI Service Health */}
            <div className="flex items-center gap-2">
              {getHealthStatusIcon()}
              <span className={`text-sm font-medium ${getHealthStatusColor()}`}>
                AI Service {aiServiceHealth === 'checking' ? 'Checking...' : aiServiceHealth}
              </span>
              <button
                onClick={checkAIHealth}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh health status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Model Selection */}
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as keyof typeof AVAILABLE_MODELS)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(AVAILABLE_MODELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Clear Conversation */}
            <button
              onClick={clearConversation}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Chat
            </button>
          </div>
        </div>

        {/* Model Info */}
        {modelInfo.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Model: {getModelDisplayName(selectedModel)} • 
            {modelInfo.find(m => m.name === `${selectedModel}:latest`)?.size && 
              ` Size: ${(modelInfo.find(m => m.name === `${selectedModel}:latest`)!.size / (1024 * 1024 * 1024)).toFixed(1)}GB`
            }
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm">Ask questions about cybersecurity, compliance, or general topics.</p>
            <div className="mt-4 text-xs bg-gray-50 rounded-lg p-3 max-w-md mx-auto">
              <p className="font-medium mb-2">Example questions:</p>
              <ul className="text-left space-y-1">
                <li>• "What are the latest cybersecurity threats?"</li>
                <li>• "How do I implement compliance controls?"</li>
                <li>• "Explain zero-trust architecture"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!message.isUser && (
              <div className="flex-shrink-0">
                <Bot className="w-8 h-8 text-blue-600 bg-blue-100 rounded-full p-1.5" />
              </div>
            )}
            
            <div className={`max-w-3xl ${message.isUser ? 'order-first' : ''}`}>
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.isUser
                    ? 'bg-blue-600 text-white ml-auto'
                    : message.content.startsWith('Error:')
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Message metadata */}
                <div className={`text-xs mt-2 flex items-center gap-2 ${
                  message.isUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                  {message.model && (
                    <span>• {getModelDisplayName(message.model.replace(':latest', ''))}</span>
                  )}
                  {message.metadata?.duration && (
                    <span>• {formatDuration(message.metadata.duration)}</span>
                  )}
                </div>
              </div>
            </div>

            {message.isUser && (
              <div className="flex-shrink-0">
                <User className="w-8 h-8 text-gray-600 bg-gray-200 rounded-full p-1.5" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <Bot className="w-8 h-8 text-blue-600 bg-blue-100 rounded-full p-1.5" />
            <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-3xl">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${getModelDisplayName(selectedModel)} a question...`}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={inputMessage.split('\n').length || 1}
            maxLength={2000}
            disabled={isLoading || aiServiceHealth !== 'healthy'}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || aiServiceHealth !== 'healthy'}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
        
        {aiServiceHealth !== 'healthy' && (
          <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            AI service is currently unavailable. Please check the connection to u5.
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line • {inputMessage.length}/2000 characters
        </div>
      </div>
    </div>
  );
} 