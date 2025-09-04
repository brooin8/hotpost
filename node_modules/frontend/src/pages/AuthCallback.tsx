import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { ebayAuthManager } from '../utils/ebayAuth';
import useAuthStore from '../stores/authStore';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if this is running in a popup
        const isPopup = window.opener !== null;
        console.log('AuthCallback: Running in popup?', isPopup);
        
        // Check for OAuth errors
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          const errorMsg = errorDescription || `Authentication failed: ${error}`;
          
          if (isPopup && window.opener) {
            // Send error message to parent window
            window.opener.postMessage({
              type: 'EBAY_AUTH_ERROR',
              error: errorMsg
            }, window.location.origin);
            window.close();
            return;
          }
          
          throw new Error(errorMsg);
        }

        // Check for legacy eBay token first
        const ebayToken = searchParams.get('eBayToken');
        if (ebayToken) {
          setMessage('Processing eBay legacy token...');
          
          try {
            // Store the legacy eBay token
            ebayAuthManager.storeLegacyToken(ebayToken);
            
            // Create user object for eBay
            const user = {
              id: `ebay_user_${Date.now()}`,
              email: 'theone88@gmail.com',
              firstName: 'eBay',
              lastName: 'User'
            };
            
            const demoToken = `ebay_legacy_${user.id}_${Date.now()}`;
            
            // Store authentication data
            localStorage.setItem('token', demoToken);
            localStorage.setItem('user', JSON.stringify(user));
            
            setStatus('success');
            setMessage('eBay authentication successful!');
            
            // Update auth store
            await checkAuth();
            
            if (isPopup && window.opener) {
              // Send success message to parent window
              window.opener.postMessage({
                type: 'EBAY_AUTH_SUCCESS',
                user: user,
                token: demoToken,
                tokens: {
                  access_token: ebayToken,
                  token_type: 'legacy_ebay_token',
                  expires_in: 47304000
                }
              }, window.location.origin);
              
              // Show success for a moment then close
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              // Redirect to dashboard after success
              setTimeout(() => {
                toast.success('Welcome! Connected to eBay! 🎉');
                navigate('/dashboard');
              }, 1500);
            }
            
            return;
          } catch (error: any) {
            console.error('eBay legacy token error:', error);
            throw new Error(`eBay authentication failed: ${error.message}`);
          }
        }

        // Handle authorization code (for OAuth flows)
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (code) {
          setMessage('Exchanging authorization code...');
          
          // Determine the provider based on state parameter
          let provider = 'google'; // default
          if (state && state.startsWith('ebay_')) {
            provider = 'ebay';
          } else if (state && state.startsWith('google_')) {
            provider = 'google';
          }

          if (provider === 'ebay') {
            try {
              // Exchange eBay authorization code for tokens
              const tokens = await ebayAuthManager.exchangeCodeForTokens(code);
              ebayAuthManager.storeTokens(tokens);
              
              // Create user object for eBay (since eBay doesn't provide user info in token exchange)
              const user = {
                id: `ebay_user_${Date.now()}`,
                email: 'ebay@user.com', // eBay doesn't provide email in this flow
                firstName: 'eBay',
                lastName: 'User'
              };
              
              const demoToken = `ebay_${user.id}_${Date.now()}`;
              
              // Store authentication data
              localStorage.setItem('token', demoToken);
              localStorage.setItem('user', JSON.stringify(user));
              
              setStatus('success');
              setMessage('eBay authentication successful!');
              
              // Update auth store
              await checkAuth();
              
              if (isPopup && window.opener) {
                // Send success message to parent window
                window.opener.postMessage({
                  type: 'EBAY_AUTH_SUCCESS',
                  user: user,
                  token: demoToken,
                  tokens: tokens
                }, window.location.origin);
                
                // Show success for a moment then close
                setTimeout(() => {
                  window.close();
                }, 1500);
              } else {
                // Redirect to dashboard after success
                setTimeout(() => {
                  toast.success('Welcome! Connected to eBay! 🎉');
                  navigate('/dashboard');
                }, 1500);
              }
              
              return;
            } catch (error: any) {
              console.error('eBay token exchange error:', error);
              throw new Error(`eBay authentication failed: ${error.message}`);
            }
          } else {
            // Handle Google or other providers (existing logic)
            const user = {
              id: `${provider}_user_${Date.now()}`,
              email: 'user@example.com',
              firstName: 'User',
              lastName: 'Name'
            };

            const demoToken = `${provider}_${user.id}_${Date.now()}`;
            
            // Store authentication data
            localStorage.setItem('token', demoToken);
            localStorage.setItem('user', JSON.stringify(user));
            
            setStatus('success');
            setMessage(`${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication successful!`);
            
            // Update auth store
            await checkAuth();
            
            // Redirect to dashboard after success
            setTimeout(() => {
              toast.success('Welcome! 🎉');
              navigate('/dashboard');
            }, 1500);
            
            return;
          }
        }

        // Handle direct hash-based tokens (for implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const idToken = hashParams.get('id_token');
        
        if (accessToken || idToken) {
          setMessage('Processing tokens...');
          
          // Parse ID token if available
          let user;
          if (idToken) {
            user = parseJwtToken(idToken);
          } else {
            // Fallback user object
            user = {
              id: `user_${Date.now()}`,
              email: 'user@example.com',
              firstName: 'User',
              lastName: 'Name'
            };
          }

          const demoToken = `oauth_${user.id}_${Date.now()}`;
          
          // Store authentication data
          localStorage.setItem('token', demoToken);
          localStorage.setItem('user', JSON.stringify(user));
          
          setStatus('success');
          setMessage('Authentication successful!');
          
          // Redirect to dashboard after success
          setTimeout(() => {
            toast.success('Welcome! 🎉');
            navigate('/dashboard');
          }, 1500);
          
          return;
        }

        // If we get here, no valid auth data was found
        throw new Error('No valid authentication data received');

      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        const errorMsg = error.message || 'Authentication failed';
        setMessage(errorMsg);
        
        // Check if this is running in a popup
        const isPopup = window.opener !== null;
        
        if (isPopup && window.opener) {
          // Send error message to parent window
          window.opener.postMessage({
            type: 'EBAY_AUTH_ERROR',
            error: errorMsg
          }, window.location.origin);
          
          // Close popup after showing error briefly
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          // Redirect to login after error
          setTimeout(() => {
            toast.error('Authentication failed. Please try again.');
            navigate('/login');
          }, 3000);
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  const parseJwtToken = (token: string) => {
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
      console.error('Failed to parse JWT token:', error);
      return {
        id: `user_${Date.now()}`,
        email: 'user@example.com',
        firstName: 'User',
        lastName: 'Name'
      };
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-8">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <ArrowPathIcon className="h-16 w-16 text-blue-500 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-primary-700 mb-2">
                Authenticating
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
                Authentication Failed
              </h2>
            </div>
          )}
        </div>
        
        <p className="text-primary-600 mb-4">{message}</p>
        
        {status !== 'loading' && (
          <p className="text-sm text-primary-500">
            {status === 'success' ? 'Redirecting to dashboard...' : 'Redirecting to login...'}
          </p>
        )}
        
        <div className="mt-6">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
