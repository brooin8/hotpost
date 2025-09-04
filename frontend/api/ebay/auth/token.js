export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // Allow custom headers used by the app
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-EBAY-TOKENS, X-USER-ID, x-ebay-tokens, x-user-id'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
