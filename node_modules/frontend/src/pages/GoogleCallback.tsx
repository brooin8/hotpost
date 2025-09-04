import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing Google authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check URL parameters for errors
        const error = searchParams.get('error');
        if (error) {
          throw new Error(`Google authorization failed: ${error}`);
        }

        setMessage('Processing Google authentication...');

        // Get ID token from URL fragment (for response_type=id_token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const idToken = hashParams.get('id_token');
        
        if (!idToken) {
          throw new Error('No ID token received from Google');
        }

        setMessage('Extracting user information...');
        
        // Parse the ID token to get user info
        const userData = parseJwtToken(idToken);
        
        setStatus('success');
        setMessage('Google account connected successfully!');
        
        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            user: userData
          }, window.location.origin);
        }
        
        // Check if we're in a popup or main window
        if (window.opener) {
          // We're in a popup - auto-close after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // We're in the main window - store auth and redirect
          // Create user object for local storage
          const user = {
            id: userData.id,
            email: userData.email,
            firstName: userData.given_name,
            lastName: userData.family_name
          };
          
          // Generate a simple token for demo purposes
          const demoToken = `google-${userData.id}-${Date.now()}`;
          
          // Store in localStorage
          localStorage.setItem('token', demoToken);
          localStorage.setItem('user', JSON.stringify(user));
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }

      } catch (error: any) {
        console.error('Google callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect Google account');

        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
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
                Connecting Google Account
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

function parseJwtToken(token: string): GoogleUser {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      given_name: payload.given_name,
      family_name: payload.family_name,
      picture: payload.picture,
    };
  } catch (error) {
    throw new Error('Failed to parse Google JWT token');
  }
}
