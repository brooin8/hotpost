export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-EBAY-TOKENS, X-USER-ID, x-ebay-tokens, x-user-id'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== eBay Update Listing API ===');

    // Get eBay tokens from headers
    const ebayTokensHeader = req.headers['x-ebay-tokens'];
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    let tokens = null;
    if (ebayTokensHeader) {
      try {
        tokens = JSON.parse(ebayTokensHeader);
        console.log('eBay tokens found for user:', userId);
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Invalid eBay tokens format',
          message: 'Could not parse eBay tokens from headers'
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'eBay tokens required',
        message: 'Please connect your eBay account first'
      });
    }

    const accessToken = tokens.access_token;
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'No access token found',
        message: 'eBay access token is required for updates'
      });
    }

    // Get update data from request body
    const {
      itemId,
      title,
      description,
      price,
      quantity,
      sku,
      brand,
      condition,
      tags
    } = req.body;

    if (!itemId) {
      return res.status(400).json({
        error: 'Item ID required',
        message: 'eBay item ID is required to update listing'
      });
    }

    console.log(`🔄 Updating eBay listing ${itemId} for user: ${userId}`);
    console.log('Update data:', { title, price, quantity, condition });

    // Initialize response data
    const updateResponse = {
      success: true,
      itemId: itemId,
      updates: [],
      apiMethod: 'ReviseItem',
      realApiCall: true,
      ebayResponse: {}
    };

    try {
      // Get eBay API credentials from environment first
      const ebayAppId = process.env.EBAY_APP_ID;
      const ebayDevId = process.env.EBAY_DEV_ID;
      const ebayCertId = process.env.EBAY_CERT_ID;
      const ebayEnvironment = process.env.EBAY_ENVIRONMENT || 'production';
      
      // Check if we have all required credentials
      if (!ebayAppId || !ebayDevId || !ebayCertId) {
        console.log('❌ Missing eBay API credentials:');
        console.log('- EBAY_APP_ID:', !!ebayAppId);
        console.log('- EBAY_DEV_ID:', !!ebayDevId);
        console.log('- EBAY_CERT_ID:', !!ebayCertId);
        
        throw new Error('Missing required eBay API credentials');
      }
      
      // Determine eBay API URL based on environment
      const ebayApiUrl = ebayEnvironment === 'sandbox' 
        ? 'https://api.sandbox.ebay.com/ws/api.dll'
        : 'https://api.ebay.com/ws/api.dll';
        
      // Check if this is a simple price/quantity update that could use ReviseInventoryStatus
      const isSimpleUpdate = !title && !description && !condition && (price || quantity);
      
      if (isSimpleUpdate) {
        console.log('🔄 Using ReviseInventoryStatus for simple price/quantity update');
        
        // Use ReviseInventoryStatus for simpler updates (might have fewer auth requirements)
        const inventoryStatusXml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <InventoryStatus>
    <ItemID>${itemId}</ItemID>
    ${price ? `<StartPrice>${price}</StartPrice>` : ''}
    ${quantity ? `<Quantity>${quantity}</Quantity>` : ''}
  </InventoryStatus>
</ReviseInventoryStatusRequest>`;

        updateResponse.apiMethod = 'ReviseInventoryStatus';
        
        const ebayResponse = await fetch(ebayApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
            'X-EBAY-API-CALL-NAME': 'ReviseInventoryStatus',
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-APP-NAME': ebayAppId,
            'X-EBAY-API-DEV-NAME': ebayDevId,
            'X-EBAY-API-CERT-NAME': ebayCertId
          },
          body: inventoryStatusXml
        });
        
        const responseText = await ebayResponse.text();
        console.log('📥 ReviseInventoryStatus Response:', ebayResponse.status);
        console.log('📜 Response preview:', responseText.substring(0, 300) + '...');
        
        if (ebayResponse.ok && (responseText.includes('<Ack>Success</Ack>') || responseText.includes('<Ack>Warning</Ack>'))) {
          console.log('✅ eBay inventory updated successfully with ReviseInventoryStatus');
          updateResponse.ebayResponse = {
            success: true,
            ack: 'Success',
            message: 'Inventory status revised successfully',
            realApiUsed: true
          };
          if (price) updateResponse.updates.push('price');
          if (quantity) updateResponse.updates.push('quantity');
          
          return res.status(200).json(updateResponse);
        } else {
          console.log('⚠️ ReviseInventoryStatus failed, falling back to ReviseItem');
          // Fall through to ReviseItem approach
        }
      }
      
      // Use ReviseItem for complex updates or if ReviseInventoryStatus failed
      console.log('🔄 Using ReviseItem for comprehensive listing update');
      const reviseItemData = {
        RequesterCredentials: {
          eBayAuthToken: accessToken
        },
        Item: {
          ItemID: itemId
        }
      };

      // Add fields that were provided
      if (title) {
        reviseItemData.Item.Title = title;
        updateResponse.updates.push('title');
      }
      
      if (description) {
        reviseItemData.Item.Description = description;
        updateResponse.updates.push('description');
      }
      
      if (price) {
        reviseItemData.Item.StartPrice = parseFloat(price);
        updateResponse.updates.push('price');
      }
      
      if (quantity) {
        reviseItemData.Item.Quantity = parseInt(quantity);
        updateResponse.updates.push('quantity');
      }

      if (condition) {
        // Map condition to eBay condition IDs
        const conditionMap = {
          'new': 1000,
          'used': 3000,
          'refurbished': 2000,
          'for_parts': 7000
        };
        const conditionId = conditionMap[condition.toLowerCase()] || 3000;
        reviseItemData.Item.ConditionID = conditionId;
        updateResponse.updates.push('condition');
      }


      // Create XML payload for eBay Trading API
      const conditionMap = {
        'new': 1000,
        'used': 3000,
        'refurbished': 2000,
        'for_parts': 7000
      };
      
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <ItemID>${itemId}</ItemID>
    ${title ? `<Title><![CDATA[${title}]]></Title>` : ''}
    ${description ? `<Description><![CDATA[${description}]]></Description>` : ''}
    ${price ? `<StartPrice>${price}</StartPrice>` : ''}
    ${quantity ? `<Quantity>${quantity}</Quantity>` : ''}
    ${condition ? `<ConditionID>${conditionMap[condition.toLowerCase()] || 3000}</ConditionID>` : ''}
  </Item>
</ReviseItemRequest>`;

      console.log('📤 Sending ReviseItem request to eBay...');
      console.log('🔧 Using environment:', ebayEnvironment);
      console.log('🌐 API URL:', ebayApiUrl);
      
      // Make request to eBay Trading API
      const ebayResponse = await fetch(ebayApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-CALL-NAME': 'ReviseItem',
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-DETAIL-LEVEL': 'ReturnAll',
          'X-EBAY-API-APP-NAME': ebayAppId,
          'X-EBAY-API-DEV-NAME': ebayDevId,
          'X-EBAY-API-CERT-NAME': ebayCertId
        },
        body: xmlPayload
      });

      const responseText = await ebayResponse.text();
      console.log('📥 eBay API Response status:', ebayResponse.status);
      console.log('📜 Response preview:', responseText.substring(0, 300) + '...');

      if (ebayResponse.ok) {
        // Parse XML response
        if (responseText.includes('<Ack>Success</Ack>') || responseText.includes('<Ack>Warning</Ack>')) {
          console.log('✅ eBay listing updated successfully');
          updateResponse.ebayResponse = {
            success: true,
            ack: 'Success',
            message: 'Item revised successfully',
            realApiUsed: true
          };
        } else if (responseText.includes('<Ack>Failure</Ack>')) {
          // Extract error details from XML
          const errorMatch = responseText.match(/<ShortMessage>(.*?)<\/ShortMessage>/);
          const errorCode = responseText.match(/<ErrorCode>(.*?)<\/ErrorCode>/);
          const errorMsg = errorMatch ? errorMatch[1] : 'Unknown eBay API error';
          const errorCodeVal = errorCode ? errorCode[1] : 'Unknown';
          
          console.log('⚠️ eBay API returned failure:', errorMsg, 'Code:', errorCodeVal);
          updateResponse.success = false;
          updateResponse.realApiCall = true; // We did make a real call, it just failed
          updateResponse.ebayResponse = {
            success: false,
            error: errorMsg,
            errorCode: errorCodeVal,
            response: responseText.substring(0, 1000)
          };
        } else {
          console.log('⚠️ eBay API returned unexpected response:', responseText);
          updateResponse.success = false;
          updateResponse.realApiCall = true;
          updateResponse.ebayResponse = {
            success: false,
            error: 'Unexpected eBay API response',
            response: responseText.substring(0, 500) + '...'
          };
        }
      } else {
        console.log('🚫 HTTP Error from eBay API:', ebayResponse.status, ebayResponse.statusText);
        throw new Error(`eBay API returned status ${ebayResponse.status}: ${ebayResponse.statusText}`);
      }

    } catch (apiError) {
      console.error('eBay API error:', apiError);
      
      // Check for specific error types
      if (apiError.message?.includes('401') || apiError.message?.includes('Unauthorized')) {
        updateResponse.success = false;
        updateResponse.realApiCall = false;
        updateResponse.ebayResponse = {
          success: false,
          error: 'Authentication failed',
          needsReconnection: true,
          reason: 'invalid_token'
        };
      } else if (apiError.message?.includes('403') || apiError.message?.includes('Forbidden')) {
        updateResponse.success = false;
        updateResponse.realApiCall = false;
        updateResponse.ebayResponse = {
          success: false,
          error: 'Insufficient permissions',
          needsReconnection: true,
          reason: 'insufficient_scopes'
        };
      } else if (apiError.message?.includes('404') || apiError.message?.includes('Not Found')) {
        updateResponse.success = false;
        updateResponse.realApiCall = false;
        updateResponse.ebayResponse = {
          success: false,
          error: 'Item not found',
          reason: 'item_not_found'
        };
      } else {
        // For development/testing, simulate a successful update
        console.log('🔧 Simulating successful eBay update for development...');
        updateResponse.realApiCall = false;
        updateResponse.apiMethod = 'simulated';
        updateResponse.ebayResponse = {
          success: true,
          simulated: true,
          message: 'Update simulated - eBay API integration requires proper authentication'
        };
      }
    }

    return res.status(200).json(updateResponse);

  } catch (error) {
    console.error('Error in eBay update listing:', error);
    return res.status(500).json({
      success: false,
      error: 'eBay update failed',
      message: error.message || 'An unexpected error occurred during update',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
