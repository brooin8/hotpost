export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('=== eBay Auth\'n\'Auth Authentication ===');
    
    if (req.method === 'GET') {
      // Generate Auth'n'Auth URL
      const ruName = process.env.EBAY_RUNAME || process.env.VITE_EBAY_RUNAME;
      const appId = process.env.EBAY_APP_ID || process.env.VITE_EBAY_APP_ID;
      
      if (!ruName || !appId) {
        return res.status(500).json({
          error: 'Missing eBay Auth\'n\'Auth configuration',
          message: 'EBAY_RUNAME and EBAY_APP_ID environment variables are required'
        });
      }

      // Clean up the values (remove any whitespace/newlines)
      const cleanRuName = ruName.trim();
      const cleanAppId = appId.trim();
      
      // eBay Auth'n'Auth URL for production
      const authUrl = `https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&runame=${encodeURIComponent(cleanRuName)}&SessID=${encodeURIComponent(cleanAppId)}`;
      
      console.log('Generated Auth\'n\'Auth URL:', authUrl);
      console.log('Using RuName:', cleanRuName);
      console.log('Using App ID:', cleanAppId);
      
      return res.status(200).json({
        authUrl,
        ruName: cleanRuName,
        appId: cleanAppId,
        type: 'authauth'
      });
    }
    
    if (req.method === 'POST') {
      // Handle the callback with username and password
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Both username and password are required for Auth\'n\'Auth'
        });
      }
      
      console.log('Processing Auth\'n\'Auth callback for user:', username);
      
      // Get eBay credentials from environment
      const ruName = (process.env.EBAY_RUNAME || process.env.VITE_EBAY_RUNAME)?.trim();
      const appId = (process.env.EBAY_APP_ID || process.env.VITE_EBAY_APP_ID)?.trim();
      const devId = process.env.EBAY_DEV_ID?.trim();
      const certId = process.env.EBAY_CERT_ID?.trim();
      
      if (!ruName || !appId || !devId || !certId) {
        return res.status(500).json({
          error: 'Missing eBay credentials',
          message: 'All eBay Auth\'n\'Auth credentials (RUNAME, APP_ID, DEV_ID, CERT_ID) are required'
        });
      }
      
      // Call eBay's FetchToken API to get the Auth'n'Auth token
      const fetchTokenXml = `<?xml version="1.0" encoding="utf-8"?>
<FetchTokenRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <Username>${username}</Username>
    <Password>${password}</Password>
  </RequesterCredentials>
  <SecretID>${ruName}</SecretID>
</FetchTokenRequest>`;

      console.log('Calling eBay FetchToken API...');
      
      const fetchTokenResponse = await fetch('https://api.ebay.com/ws/api.dll', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-EBAY-API-SITEID': '0', // US site
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-CALL-NAME': 'FetchToken',
          'X-EBAY-API-APP-NAME': appId,
          'X-EBAY-API-DEV-NAME': devId,
          'X-EBAY-API-CERT-NAME': certId
        },
        body: fetchTokenXml
      });
      
      if (!fetchTokenResponse.ok) {
        console.error('eBay FetchToken HTTP error:', fetchTokenResponse.status);
        return res.status(502).json({
          error: 'eBay API Error',
          message: 'Failed to communicate with eBay authentication servers'
        });
      }
      
      const fetchTokenXmlResponse = await fetchTokenResponse.text();
      console.log('FetchToken XML response received, length:', fetchTokenXmlResponse.length);
      
      // Parse the XML response
      const isSuccess = fetchTokenXmlResponse.includes('<Ack>Success</Ack>');
      
      if (isSuccess) {
        // Extract the token from XML
        const tokenMatch = fetchTokenXmlResponse.match(/<eBayAuthToken>(.*?)<\/eBayAuthToken>/);
        const hardExpirationMatch = fetchTokenXmlResponse.match(/<HardExpirationTime>(.*?)<\/HardExpirationTime>/);
        
        if (tokenMatch) {
          const authToken = tokenMatch[1];
          const hardExpiration = hardExpirationMatch ? hardExpirationMatch[1] : null;
          
          console.log('✅ Auth\'n\'Auth token obtained successfully');
          console.log('Token length:', authToken.length);
          console.log('Hard expiration:', hardExpiration);
          
          // Create a token object similar to OAuth format for consistency
          const tokenData = {
            access_token: authToken,
            token_type: 'AuthnAuth',
            expires_at: hardExpiration,
            scope: 'sell.inventory sell.account sell.item trading', // Auth'n'Auth has full Trading API access
            username: username,
            created_at: new Date().toISOString()
          };
          
          return res.status(200).json({
            success: true,
            token: tokenData,
            message: 'Auth\'n\'Auth authentication successful',
            type: 'authauth'
          });
        } else {
          console.error('❌ No token found in successful response');
          return res.status(500).json({
            error: 'Parse Error',
            message: 'Could not extract token from eBay response'
          });
        }
      } else {
        // Extract error message
        const errorMatch = fetchTokenXmlResponse.match(/<LongMessage>(.*?)<\/LongMessage>/);
        const shortErrorMatch = fetchTokenXmlResponse.match(/<ShortMessage>(.*?)<\/ShortMessage>/);
        
        const errorMessage = errorMatch ? errorMatch[1] : 
                            shortErrorMatch ? shortErrorMatch[1] : 
                            'Authentication failed';
        
        console.error('❌ eBay Auth\'n\'Auth failed:', errorMessage);
        console.log('Error XML response:', fetchTokenXmlResponse.substring(0, 500));
        
        return res.status(401).json({
          error: 'Authentication Failed',
          message: errorMessage
        });
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Auth\'n\'Auth error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred during authentication'
    });
  }
}
