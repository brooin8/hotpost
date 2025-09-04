import React, { useState } from 'react';

const EbayAuthNAuthLogin = ({ onSuccess, onError }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleInputChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Attempting Auth\'n\'Auth authentication...');
      
      const response = await fetch('/api/ebay/auth/authauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Auth\'n\'Auth authentication successful:', data);
        
        // Store the Auth'n'Auth token
        localStorage.setItem('ebayAuthNAuthToken', JSON.stringify(data.token));
        localStorage.setItem('ebayAuthType', 'authauth');
        
        if (onSuccess) {
          onSuccess(data.token);
        }
        
        // Clear form
        setCredentials({ username: '', password: '' });
        setShowForm(false);
        
      } else {
        console.error('❌ Auth\'n\'Auth authentication failed:', data);
        if (onError) {
          onError(data.message || 'Authentication failed');
        }
      }
    } catch (error) {
      console.error('🚨 Auth\'n\'Auth error:', error);
      if (onError) {
        onError(error.message || 'Authentication error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Trading API Authentication Available
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              For full eBay listing management (including price updates), you can authenticate with Auth'n'Auth 
              which provides access to eBay's Trading API.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Connect with Trading API
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          eBay Trading API Authentication
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter your eBay credentials to get a Trading API token that allows full listing management.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Security Note:</strong> Your credentials are sent directly to eBay's servers to obtain 
                an authentication token. They are not stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            eBay Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={credentials.username}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your eBay username"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            eBay Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={credentials.password}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your eBay password"
            disabled={loading}
          />
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={loading || !credentials.username || !credentials.password}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Authenticating...</span>
              </div>
            ) : (
              'Authenticate with Trading API'
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setCredentials({ username: '', password: '' });
            }}
            disabled={loading}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EbayAuthNAuthLogin;
