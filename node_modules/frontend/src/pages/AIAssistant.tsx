import React, { useState } from 'react';
import DeepSeekChat from '../components/DeepSeekChat';

const AIAssistant: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<'general' | 'product' | 'listing'>('general');

  const systemMessages = {
    general: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user queries.",
    product: "You are an expert product description writer. Help users create compelling, SEO-optimized product descriptions for e-commerce listings. Focus on highlighting key features, benefits, and selling points while maintaining a professional tone.",
    listing: "You are an expert e-commerce listing optimizer. Help users improve their product listings across platforms like eBay, Amazon, and other marketplaces. Provide advice on titles, descriptions, pricing strategies, keywords, and best practices to increase visibility and sales."
  };

  const placeholders = {
    general: "Ask me anything...",
    product: "Describe your product and I'll help you create a compelling description...",
    listing: "Tell me about your product listing and I'll help optimize it..."
  };

  const modes = [
    {
      id: 'general' as const,
      name: 'General AI',
      description: 'General purpose AI assistance',
      icon: '🤖'
    },
    {
      id: 'product' as const,
      name: 'Product Descriptions',
      description: 'Generate compelling product descriptions',
      icon: '📝'
    },
    {
      id: 'listing' as const,
      name: 'Listing Optimization',
      description: 'Optimize your marketplace listings',
      icon: '🎯'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
        <p className="mt-2 text-gray-600">
          Powered by DeepSeek AI - Get help with product descriptions, listing optimization, and more
        </p>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                selectedMode === mode.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{mode.icon}</span>
                <div>
                  <h3 className={`font-semibold ${
                    selectedMode === mode.id ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {mode.name}
                  </h3>
                  <p className={`text-sm ${
                    selectedMode === mode.id ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {mode.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200" style={{ height: '600px' }}>
        <DeepSeekChat
          key={selectedMode} // Force re-render when mode changes to clear chat history
          systemMessage={systemMessages[selectedMode]}
          placeholder={placeholders[selectedMode]}
          className="h-full"
        />
      </div>

      {/* Usage Examples */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Examples</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">🤖 General AI</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Answer questions about your business</li>
              <li>• Help with market research</li>
              <li>• Provide general advice</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">📝 Product Descriptions</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Write a description for wireless headphones"</li>
              <li>• "Improve this product description: [paste text]"</li>
              <li>• "Make this sound more appealing: [description]"</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">🎯 Listing Optimization</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Optimize this eBay title: [current title]"</li>
              <li>• "Suggest keywords for smartphone case"</li>
              <li>• "Help price my vintage watch"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
