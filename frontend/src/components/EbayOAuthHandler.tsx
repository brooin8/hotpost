import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { toast } from 'react-hot-toast';

export default function EbayOAuthHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkMarketplaceConnections } = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check for eBay OAuth callback parameters
      const ebayAuthSuccess = searchParams.get('ebay_auth_success');
      const ebayAuthError = searchParams.get('ebay_auth_error');
      const tokensParam = searchParams.get('tokens');

      if (ebayAuthSuccess === 'true' && tokensParam) {
        try {
          const tokens = JSON.parse(decodeURIComponent(tokensParam));
          
          // Store the tokens
          localStorage.setItem('ebay_tokens', JSON.stringify(tokens));
          
          // Update user info with eBay connection
          const currentUser = localStorage.getItem('user');
          if (currentUser) {
            const user = JSON.parse(currentUser);
            const updatedUser = {
              ...user,
              firstName: 'Connected eBay',
              lastName: 'Seller',
              email: 'seller@ebay.com',
              ebayUser: {
                username: 'eBay Seller',
                userId: tokens.user_id || 'connected_seller',
                email: 'seller@ebay.com'
              }
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          
          // Clear URL parameters
          navigate('/settings', { replace: true });
          
          // Show success message
          toast.success('eBay account connected successfully!');
          
          // Refresh marketplace connections
          setTimeout(() => {
            checkMarketplaceConnections();
          }, 1000);
          
        } catch (error) {
          console.error('Error processing eBay tokens:', error);
          toast.error('Failed to process eBay connection');
          navigate('/settings', { replace: true });
        }
      } else if (ebayAuthError) {
        console.error('eBay OAuth error:', ebayAuthError);
        const errorDescription = searchParams.get('error_description');
        toast.error(`eBay connection failed: ${errorDescription || ebayAuthError}`);
        navigate('/settings', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, checkMarketplaceConnections]);

  return null; // This component doesn't render anything
}
