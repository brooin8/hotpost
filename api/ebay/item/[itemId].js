export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-EBAY-TOKENS, X-USER-ID, x-ebay-tokens, x-user-id'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for item details
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId } = req.query;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    console.log(`🔍 Fetching item details for: ${itemId}`);

    // Use production eBay API only
    const apiUrl = 'https://api.ebay.com';

    try {
      // Try 1: Get item details from Browse API (public item data)
      console.log(`Step 1: Fetching from Browse API for item ${itemId}...`);
      const browseResponse = await fetch(`${apiUrl}/buy/browse/v1/item/v1|${itemId}|0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3DUS,zip%3D95125'
        }
      });

      if (browseResponse.ok) {
        const itemData = await browseResponse.json();
        console.log(`✅ Browse API Success for ${itemId}:`, {
          title: itemData.title,
          hasDescription: !!itemData.description,
          descriptionLength: itemData.description?.length || 0
        });
        
        // Return the full item details with description
        return res.status(200).json({
          itemId: itemId,
          title: itemData.title,
          description: itemData.description || itemData.shortDescription || 'No detailed description available',
          longDescription: itemData.description, // Full HTML description from seller
          productDescription: itemData.productDetails?.description,
          price: itemData.price,
          condition: itemData.condition,
          images: itemData.image?.imageUrl ? [itemData.image] : [],
          seller: itemData.seller,
          itemLocation: itemData.itemLocation,
          shippingOptions: itemData.shippingOptions,
          source: 'Browse API'
        });
      } else {
        console.log(`❌ Browse API failed for ${itemId}:`, browseResponse.status, browseResponse.statusText);
        const errorText = await browseResponse.text();
        console.log('Browse API error response:', errorText.substring(0, 500));
      }

      // Try 2: Get item details from Trading API (seller's item data) 
      console.log(`Step 2: Fetching from Trading API for item ${itemId}...`);
      const tradingApiUrl = 'https://api.ebay.com/ws/api.dll';
      
      // Get credentials from environment variables
      const devId = process.env.EBAY_DEV_ID || '6d3d2edc-3bc7-489a-913e-37496e87d8c7';
      const appId = 'AndrewCa-freelist-PRD-88135f6e7-3e259810'; // Production client ID
      const certId = process.env.EBAY_CERT_ID;
      
      const tradingApiBody = `<?xml version="1.0" encoding="utf-8"?>
        <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <RequesterCredentials>
            <eBayAuthToken>${token}</eBayAuthToken>
          </RequesterCredentials>
          <ItemID>${itemId}</ItemID>
          <DetailLevel>ReturnAll</DetailLevel>
          <IncludeItemSpecifics>true</IncludeItemSpecifics>
          <Version>1193</Version>
        </GetItemRequest>`;
      
      const tradingResponse = await fetch(tradingApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
          'X-EBAY-API-DEV-NAME': devId,
          'X-EBAY-API-APP-NAME': appId || 'default-app',
          'X-EBAY-API-CERT-NAME': certId || 'default-cert',
          'X-EBAY-API-CALL-NAME': 'GetItem',
          'X-EBAY-API-SITEID': '0'
        },
        body: tradingApiBody
      });
      
      if (tradingResponse.ok) {
        const xmlText = await tradingResponse.text();
        console.log(`✅ Trading API Response for ${itemId}:`, xmlText.substring(0, 300));
        
        // Check for errors first
        if (xmlText.includes('<Errors>')) {
          console.log(`❌ Trading API returned errors for ${itemId}:`, xmlText.substring(0, 1000));
        } else {
          // Extract detailed description from XML
          const title = (xmlText.match(/<Title><!\[CDATA\[(.*?)\]\]><\/Title>/) || xmlText.match(/<Title>(.*?)<\/Title>/) || [])[1] || 'eBay Item';
          
          // Extract description - this is the full HTML description from the seller
          let description = '';
          const descriptionMatch = xmlText.match(/<Description><!\[CDATA\[([\s\S]*?)\]\]><\/Description>/);
          if (descriptionMatch) {
            description = descriptionMatch[1];
          } else {
            const simpleDescriptionMatch = xmlText.match(/<Description>([\s\S]*?)<\/Description>/);
            if (simpleDescriptionMatch) {
              description = simpleDescriptionMatch[1];
            }
          }
          
          // Also extract subtitle if available
          const subtitle = (xmlText.match(/<SubTitle><!\[CDATA\[(.*?)\]\]><\/SubTitle>/) || xmlText.match(/<SubTitle>(.*?)<\/SubTitle>/) || [])[1] || '';
          
          console.log(`✅ Extracted description for ${itemId}:`, {
            title,
            subtitle,
            descriptionLength: description.length,
            descriptionPreview: description.substring(0, 100) + '...'
          });
          
          // Return the detailed item information
          return res.status(200).json({
            itemId: itemId,
            title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            description: description || subtitle || 'No detailed description available',
            longDescription: description,
            subtitle: subtitle,
            source: 'Trading API - GetItem'
          });
        }
      } else {
        console.log(`❌ Trading API failed for ${itemId}:`, tradingResponse.status, tradingResponse.statusText);
        const errorText = await tradingResponse.text();
        console.log('Trading API error response:', errorText.substring(0, 500));
      }

      // Try 3: Fallback to a generic item lookup
      console.log(`Step 3: Fallback generic lookup for item ${itemId}...`);
      return res.status(200).json({
        itemId: itemId,
        title: `eBay Item ${itemId}`,
        description: `Detailed description for eBay item ${itemId} is not available through the current API access level.`,
        longDescription: 'Description could not be retrieved',
        source: 'Fallback',
        note: 'Full eBay API access may be needed for complete item descriptions'
      });

    } catch (apiError) {
      console.error(`Error fetching item ${itemId}:`, apiError);
      
      return res.status(500).json({
        error: 'Failed to fetch item details',
        itemId: itemId,
        message: apiError.message,
        description: `Unable to fetch detailed description for item ${itemId}. ${apiError.message}`,
        source: 'Error'
      });
    }

  } catch (error) {
    console.error('Error in eBay item details proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
