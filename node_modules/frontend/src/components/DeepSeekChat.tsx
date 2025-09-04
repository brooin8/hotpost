import React, { useState } from 'react';
import { deepSeekService, type DeepSeekMessage } from '../services/deepseek';
import toast from 'react-hot-toast';

interface DeepSeekChatProps {
  placeholder?: string;
  systemMessage?: string;
  className?: string;
}

const DeepSeekChat: React.FC<DeepSeekChatProps> = ({
  placeholder = "Ask DeepSeek anything...",
  systemMessage,
  className = ""
}) => {
  const [messages, setMessages] = useState<DeepSeekMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if DeepSeek is available
    if (!deepSeekService) {
      toast.error('DeepSeek service is not available. Please check your configuration.');
      return;
    }

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: input.trim()
    };

    // Add user message to conversation
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare messages for API (include system message if provided)
      const apiMessages: DeepSeekMessage[] = [];
      
      if (systemMessage && newMessages.length === 1) {
        // Only add system message on first interaction
        apiMessages.push({ role: 'system', content: systemMessage });
      }
      
      apiMessages.push(...newMessages);

      const response = await deepSeekService.chat(apiMessages);

      const assistantMessage: DeepSeekMessage = {
        role: 'assistant',
        content: response
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('DeepSeek error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response from DeepSeek');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">DeepSeek AI Chat</h3>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation with DeepSeek AI</p>
            {systemMessage && (
              <p className="text-sm mt-2">System: {systemMessage}</p>
            )}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3/4 p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">
                  {message.role === 'user' ? 'You' : 'DeepSeek'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
              <div className="text-xs opacity-75 mb-1">DeepSeek</div>
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeepSeekChat;
