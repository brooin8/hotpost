export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // Allow custom headers used by the app
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-EBAY-TOKENS, X-USER-ID, x-ebay-tokens, x-user-id'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle GET request for OAuth URL generation or connection status
    if (req.method === 'GET') {
      const { action } = req.query;
      
      // Get eBay credentials from environment
      const appId = (process.env.EBAY_APP_ID || 'AndrewCa-freelist-PRD-88135f6e7-3e259810').trim();
      const certId = process.env.EBAY_CERT_ID?.trim();
      const environment = (process.env.EBAY_ENVIRONMENT || 'production').trim();
      
      if (action === 'connect') {
        // Generate OAuth URL for connection
        console.log('=== Generating eBay OAuth URL ===');
        
        if (!appId) {
          return res.status(500).json({ error: 'eBay App ID not configured' });
        }

        // Determine the correct URLs based on environment
        const authUrl = environment === 'sandbox'
          ? 'https://auth.sandbox.ebay.com'
          : 'https://auth.ebay.com';

        // Get the current domain for redirect URI
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        const redirectUri = `${baseUrl}/api/ebay/auth/token?callback=true`;
        
        // Define required scopes for eBay listing management
        const scopes = [
          'https://api.ebay.com/oauth/api_scope',
          'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
          'https://api.ebay.com/oauth/api_scope/sell.inventory',
          'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
          'https://api.ebay.com/oauth/api_scope/sell.account',
          'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
          'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
        ];

        // Generate state parameter for security
        const state = `ebay_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Build OAuth authorization URL
        const authParams = new URLSearchParams({
          client_id: appId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: scopes.join(' '),
          state: state
        });

        const authorizationUrl = `${authUrl}/oauth2/authorize?${authParams.toString()}`;
        
        return res.status(200).json({
          authorizationUrl: authorizationUrl,
          state: state,
          redirectUri: redirectUri,
          scopes: scopes,
          environment: environment
        });
        
      } else if (action === 'status') {
        // Check connection status
        console.log('=== Checking eBay Connection Status ===');
        
        const ebayTokensHeader = req.headers['x-ebay-tokens'];
        
        const marketplaces = {
          ebay: {
            connected: false,
            status: 'disconnected',
            scopes: [],
            expiresAt: null,
            error: null
          }
        };
        
        if (ebayTokensHeader) {
          try {
            const tokens = JSON.parse(ebayTokensHeader);
            
            if (tokens.access_token) {
              const expiryTime = tokens.expires_at || tokens.expiry;
              const isExpired = expiryTime ? new Date(expiryTime) <= new Date() : false;
              
              if (!isExpired) {
                // Test the token with a simple API call
                try {
                  const apiUrl = environment === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
                  const testResponse = await fetch(`${apiUrl}/sell/account/v1/program`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${tokens.access_token}`,
                      'Content-Type': 'application/json',
                      'Accept-Language': 'en-US',
                      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
                    }
                  });
                  
                  if (testResponse.ok) {
                    marketplaces.ebay = {
                      connected: true,
                      status: 'connected',
                      scopes: tokens.scope ? tokens.scope.split(' ') : [],
                      expiresAt: expiryTime,
                      lastChecked: new Date().toISOString()
                    };
                  } else {
                    marketplaces.ebay.status = 'token_invalid';
                    marketplaces.ebay.error = 'Token test failed';
                  }
                } catch (testError) {
                  marketplaces.ebay.status = 'token_test_failed';
                  marketplaces.ebay.error = testError.message;
                }
              } else {
                marketplaces.ebay.status = 'token_expired';
                marketplaces.ebay.error = 'Token has expired';
              }
            } else {
              marketplaces.ebay.status = 'no_access_token';
            }
          } catch (parseError) {
            marketplaces.ebay.status = 'token_parse_error';
            marketplaces.ebay.error = parseError.message;
          }
        } else {
          marketplaces.ebay.status = 'no_tokens';
          marketplaces.ebay.error = 'No eBay tokens found';
        }
        
        return res.status(200).json({ marketplaces });
        
      } else if (req.query.callback === 'true') {
        // Handle OAuth callback
        console.log('=== eBay OAuth Callback ===');
        
        const { code, state, error: authError, error_description } = req.query;
        
        if (authError) {
          const frontendUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
          const errorUrl = `${frontendUrl}?ebay_auth_error=${encodeURIComponent(authError)}&error_description=${encodeURIComponent(error_description || '')}`;
          return res.redirect(302, errorUrl);
        }

        if (!code) {
          const frontendUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
          const errorUrl = `${frontendUrl}?ebay_auth_error=no_code`;
          return res.redirect(302, errorUrl);
        }

        if (!appId || !certId) {
          const frontendUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
          const errorUrl = `${frontendUrl}?ebay_auth_error=missing_credentials`;
          return res.redirect(302, errorUrl);
        }

        // Exchange authorization code for access tokens
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        const redirectUri = `${baseUrl}/api/ebay/auth/token?callback=true`;
        
        const apiUrl = environment === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
        const tokenUrl = `${apiUrl}/identity/v1/oauth2/token`;
        
        const requestBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        });

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${appId}:${certId}`).toString('base64')}`
          },
          body: requestBody
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          const frontendUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
          const errorUrl = `${frontendUrl}?ebay_auth_error=token_exchange_failed&error_description=${encodeURIComponent(tokenData.error_description || '')}`;
          return res.redirect(302, errorUrl);
        }

        // Prepare the final token object
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
        const finalTokens = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type || 'Bearer',
          scope: tokenData.scope,
          expires_in: tokenData.expires_in,
          expires_at: expiresAt,
          obtained_at: new Date().toISOString(),
          environment: environment
        };

        // Redirect back to frontend with tokens
        const frontendUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
        const successUrl = `${frontendUrl}?ebay_auth_success=true&tokens=${encodeURIComponent(JSON.stringify(finalTokens))}&state=${encodeURIComponent(state)}`;
        
        return res.redirect(302, successUrl);
      }
      
      return res.status(400).json({ error: 'Invalid action parameter' });
    }
    
    // Handle POST request for token exchange
    const { grant_type, code, redirect_uri, refresh_token } = req.body;

    if (!grant_type) {
      return res.status(400).json({ error: 'Missing grant_type' });
    }

    // Get eBay credentials from environment (clean up any whitespace)
    const appId = (process.env.EBAY_APP_ID || 'AndrewCa-freelist-PRD-88135f6e7-3e259810').trim();
    const certId = process.env.EBAY_CERT_ID?.trim();
    const environment = (process.env.EBAY_ENVIRONMENT || 'production').trim();
    
    console.log('🔑 eBay Token API - Environment Check:', {
      appId: appId?.substring(0, 20) + '...',
      certId: certId ? certId.substring(0, 10) + '...' : 'missing',
      environment: environment,
      hasAppId: !!appId,
      hasCertId: !!certId
    });

    if (!appId || !certId) {
      return res.status(500).json({ error: 'eBay credentials not configured' });
    }

    const authUrl = environment === 'sandbox'
      ? 'https://auth.sandbox.ebay.com'
      : 'https://auth.ebay.com';

    // eBay API base URL for token endpoint (different from auth URL)
    const apiUrl = environment === 'sandbox'
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';

    // Prepare request body based on grant type
    let requestBody;
    
    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Missing code or redirect_uri for authorization_code grant' });
      }
      requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      });
    } else if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return res.status(400).json({ error: 'Missing refresh_token for refresh_token grant' });
      }
      requestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      });
    } else {
      return res.status(400).json({ error: 'Unsupported grant_type' });
    }

    // Make request to eBay token endpoint - use API URL not auth URL
    const tokenUrl = `${apiUrl}/identity/v1/oauth2/token`;
    console.log('🔗 eBay Token Request:', {
      url: tokenUrl,
      environment,
      appId: appId?.substring(0, 20) + '...',
      certId: certId?.substring(0, 10) + '...',
      grantType: grant_type,
      redirectUri: redirect_uri
    });
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${appId}:${certId}`).toString('base64')}`
      },
      body: requestBody
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('eBay token request failed:', responseData);
      return res.status(response.status).json({
        error: responseData.error_description || responseData.error || 'Token request failed',
        details: responseData
      });
    }

    // Return the token response
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('eBay token proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
