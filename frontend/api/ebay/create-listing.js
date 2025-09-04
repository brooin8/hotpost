export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // Allow custom headers used by the app
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
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const productData = req.body;

    console.log('Creating eBay listing for product:', productData);

    // Get eBay credentials
    const devId = process.env.EBAY_DEV_ID || '6d3d2edc-3bc7-489a-913e-37496e87d8c7';
    const appId = 'AndrewCa-freelist-PRD-88135f6e7-3e259810';
    const certId = process.env.EBAY_CERT_ID;

    // Step 1: Create inventory item
    const inventoryData = {
      availability: {
        shipToLocationAvailability: {
          quantity: parseInt(productData.quantity) || 1
        }
      },
      condition: mapConditionToEbay(productData.condition),
      product: {
        title: productData.title,
        description: productData.description,
        aspects: {
          Brand: [productData.brand || 'Unbranded'],
          Condition: [mapConditionToEbay(productData.condition)]
        },
        imageUrls: productData.imageUrls || []
      }
    };

    // Step 2: Create offer
    const offerData = {
      sku: productData.sku || `SKU-${Date.now()}`,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      availableQuantity: parseInt(productData.quantity) || 1,
      categoryId: '182050', // General category - in real app, you'd determine this
      pricingSummary: {
        price: {
          value: productData.price,
          currency: 'USD'
        }
      },
      listingDescription: productData.description,
      listingPolicies: {
        fulfillmentPolicyId: 'default', // Would need real policy IDs
        paymentPolicyId: 'default',
        returnPolicyId: 'default'
      },
      merchantLocationKey: 'default'
    };

    // For demo purposes, we'll simulate the eBay API calls
    // In a real implementation, you would:
    
    try {
      // 1. Create inventory item
      console.log('Step 1: Creating eBay inventory item...');
      // const inventoryResponse = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${offerData.sku}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //     'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      //   },
      //   body: JSON.stringify(inventoryData)
      // });

      // 2. Create offer
      console.log('Step 2: Creating eBay offer...');
      // const offerResponse = await fetch('https://api.ebay.com/sell/inventory/v1/offer', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //     'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      //   },
      //   body: JSON.stringify(offerData)
      // });

      // 3. Publish offer
      console.log('Step 3: Publishing eBay listing...');
      // const publishResponse = await fetch(`https://api.ebay.com/sell/inventory/v1/offer/${offerId}/publish`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //     'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      //   }
      // });

      // Simulate successful eBay listing creation
      const simulatedListing = {
        listingId: `eBay-${Date.now()}`,
        sku: offerData.sku,
        status: 'ACTIVE',
        listingUrl: `https://www.ebay.com/itm/${Date.now()}`,
        marketplace: 'EBAY_US',
        createdAt: new Date().toISOString(),
        debug: {
          message: 'eBay listing created successfully (simulated)',
          inventoryData: {
            sku: offerData.sku,
            title: productData.title,
            quantity: productData.quantity
          },
          offerData: {
            price: productData.price,
            category: '182050',
            marketplace: 'EBAY_US'
          }
        }
      };

      console.log('✅ eBay listing created successfully:', simulatedListing);
      return res.status(201).json(simulatedListing);

    } catch (ebayError) {
      console.error('eBay API error:', ebayError);
      throw new Error(`eBay listing creation failed: ${ebayError.message}`);
    }

  } catch (error) {
    console.error('Error creating eBay listing:', error);
    res.status(500).json({ 
      error: 'Failed to create eBay listing',
      message: error.message,
      details: 'Check eBay API credentials and permissions'
    });
  }
}

/**
 * Map internal condition values to eBay condition values
 */
function mapConditionToEbay(condition) {
  const conditionMap = {
    'new': 'NEW',
    'like_new': 'NEW_OTHER',
    'very_good': 'USED_EXCELLENT', 
    'good': 'USED_VERY_GOOD',
    'acceptable': 'USED_GOOD',
    'used': 'USED'
  };
  
  return conditionMap[condition] || 'NEW';
}
