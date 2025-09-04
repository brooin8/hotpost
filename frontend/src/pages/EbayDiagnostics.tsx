import { useState, useEffect } from 'react';
import { ebayAuthManager } from '../utils/ebayAuth';

export default function EbayDiagnostics() {
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [tokenStatus, setTokenStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = () => {
    const config = ebayAuthManager.getConfigStatus();
    const tokens = ebayAuthManager.getTokenStatus();
    
    setConfigStatus(config);
    setTokenStatus(tokens);
    
    // Add initial log
    addLog('eBay diagnostics loaded');
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAuthUrl = () => {
    try {
      const authUrl = ebayAuthManager.generateAuthUrl('test_' + Date.now());
      addLog(`Generated auth URL: ${authUrl}`);
      console.log('eBay Auth URL:', authUrl);
    } catch (error: any) {
      addLog(`Error generating auth URL: ${error.message}`);
    }
  };

  const clearTokens = () => {
    localStorage.removeItem('ebay_tokens');
    loadDiagnostics();
    addLog('eBay tokens cleared');
  };

  const storeManualToken = () => {
    if (!manualToken.trim()) {
      addLog('No token provided');
      return;
    }

    try {
      if (ebayAuthManager.isLegacyToken(manualToken)) {
        ebayAuthManager.storeLegacyToken(manualToken);
        addLog('Legacy eBay token stored successfully');
        
        // Also create user session
        const user = {
          id: `ebay_user_${Date.now()}`,
          email: 'theone88@gmail.com',
          firstName: 'eBay',
          lastName: 'User'
        };
        
        const demoToken = `ebay_legacy_${user.id}_${Date.now()}`;
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        addLog('User session created');
      } else {
        addLog('Invalid token format - expected legacy eBay token starting with v^1.1#');
        return;
      }
      
      loadDiagnostics();
      setManualToken('');
    } catch (error: any) {
      addLog(`Error storing token: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">eBay Authentication Diagnostics</h1>
          
          {/* Common eBay Sandbox Issues */}
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-800 mb-3">Common eBay Sandbox Issues</h2>
            <div className="space-y-2 text-sm text-yellow-700">
              <p><strong>Cookie expiration errors:</strong> These are normal in eBay sandbox and don't affect functionality.</p>
              <p><strong>CORS errors on tracking scripts:</strong> eBay's own scripts have CORS issues - this is expected in sandbox.</p>
              <p><strong>Script integrity errors:</strong> eBay's CDN scripts may have version mismatches in sandbox environment.</p>
              <p><strong>These errors are harmless</strong> and won't prevent your OAuth flow from working.</p>
            </div>
          </div>

          {/* Configuration Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Configuration Status</h2>
            {configStatus && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Configured:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      configStatus.configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {configStatus.configured ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Environment:</span>
                    <span className="ml-2 text-gray-600">{configStatus.environment}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">App ID:</span>
                    <span className="ml-2 text-gray-600 font-mono text-sm">{configStatus.appId}</span>
                  </div>
                  {configStatus.missingCredentials.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium text-red-600">Missing:</span>
                      <span className="ml-2 text-red-600">{configStatus.missingCredentials.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Token Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Token Status</h2>
            {tokenStatus && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      tokenStatus.status === 'valid' ? 'bg-green-100 text-green-800' : 
                      tokenStatus.status === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {tokenStatus.status}
                    </span>
                  </div>
                  {tokenStatus.status !== 'no_tokens' && (
                    <>
                      <div>
                        <span className="font-medium">Expires:</span>
                        <span className="ml-2 text-gray-600 text-sm">{tokenStatus.time_until_expiry}</span>
                      </div>
                      <div>
                        <span className="font-medium">Refresh Token:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          tokenStatus.has_refresh_token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tokenStatus.has_refresh_token ? 'Available' : 'Missing'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {tokenStatus.message && (
                  <p className="mt-2 text-sm text-gray-600">{tokenStatus.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Manual Token Input */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Manual Token Testing</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-3">
                If eBay didn't redirect automatically, you can paste your token here to test the integration:
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste your eBay token (v^1.1#i^1#...)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                />
                <button
                  onClick={storeManualToken}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  Store Token
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Actions</h2>
            <div className="flex space-x-4">
              <button
                onClick={testAuthUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Test Auth URL Generation
              </button>
              <button
                onClick={clearTokens}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear Stored Tokens
              </button>
              <button
                onClick={loadDiagnostics}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Refresh Status
              </button>
            </div>
          </div>

          {/* Logs */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Debug Logs</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
