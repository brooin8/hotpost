import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
// import { toast } from 'react-hot-toast';
import { ebayAuthManager } from '../utils/ebayAuth';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function EbayCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        // const state = searchParams.get('state');

        if (error) {
          throw new Error(`eBay authorization failed: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from eBay');
        }

        setMessage('Exchanging authorization code for tokens...');

        // Exchange code for tokens
        const tokens = await ebayAuthManager.exchangeCodeForTokens(code);
        
        // Store tokens using the new method with automatic timestamp
        ebayAuthManager.storeTokens(tokens);

        setStatus('success');
        setMessage('eBay account connected successfully!');

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'EBAY_AUTH_SUCCESS',
            tokens: tokens
          }, window.location.origin);
        }

        // Check if we're in a popup or main window
        if (window.opener) {
          // We're in a popup - auto-close after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // We're in the main window - redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }

      } catch (error: any) {
        console.error('eBay callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect eBay account');

        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'EBAY_AUTH_ERROR',
            error: error.message
          }, window.location.origin);
        }

        // Check if we're in a popup or main window
        if (window.opener) {
          // We're in a popup - auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          // We're in the main window - redirect to login
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-8">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <ArrowPathIcon className="h-16 w-16 text-blue-500 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-primary-700 mb-2">
                Connecting eBay Account
              </h2>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-green-700 mb-2">
                Success!
              </h2>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircleIcon className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">
                Connection Failed
              </h2>
            </div>
          )}
        </div>
        
        <p className="text-primary-600 mb-4">{message}</p>
        
        {status !== 'loading' && (
          <p className="text-sm text-primary-500">
            This window will close automatically in a few seconds...
          </p>
        )}
        
        <div className="mt-6">
          <button
            onClick={() => window.close()}
            className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
