export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  // Allow custom headers used by the app (case-insensitive duplicates to satisfy different environments)
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
    console.log('=== eBay Sync API ===');

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
        message: 'eBay access token is required for sync'
      });
    }

    console.log(`🔄 Starting eBay sync for user: ${userId}`);
    
    // Initialize sync results
    const syncResults = {
      success: true,
      importedListings: 0,
      importedOrders: 0,
      updatedProducts: 0,
      errors: []
    };

    // Step 1: Use the same listings API that the Products page uses
    console.log('📥 Fetching eBay listings using same API as Products page...');
    
    let actualSyncedProducts = [];
    
    try {
      // Get the base URL for internal API calls
      const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://crosslist-pro-deepseek.vercel.app';
      const listingsUrl = `${baseUrl}/api/ebay/listings?limit=100`;
      
      console.log('Calling internal listings API:', listingsUrl);
      
      const listingsResponse = await fetch(listingsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Sync-API/1.0'
        }
      });
      
      if (listingsResponse.ok) {
        const listingsData = await listingsResponse.json();
        console.log(`✅ Internal listings API returned ${listingsData.total || 0} items`);
        
        if (listingsData.itemSummaries && listingsData.itemSummaries.length > 0) {
          // Convert listings API response to sync format
          actualSyncedProducts = listingsData.itemSummaries.map((item, index) => {
            const images = [];
            
            // Handle different image formats from listings API
            if (item.images && Array.isArray(item.images)) {
              item.images.forEach((img, imgIndex) => {
                const imageUrl = typeof img === 'string' ? img : (img.url || img.imageUrl || img);
                if (imageUrl) {
                  images.push({
                    url: imageUrl,
                    isPrimary: imgIndex === 0,
                    order: imgIndex + 1
                  });
                }
              });
            } else if (item.image?.imageUrl) {
              images.push({
                url: item.image.imageUrl,
                isPrimary: true,
                order: 1
              });
            }
            
            // Convert to sync format
            const product = {
              id: `ebay_${item.itemId || index}`,
              itemId: item.itemId,
              ebayItemId: item.itemId,
              name: item.title || 'eBay Listing',
              title: item.title || 'eBay Listing',
              description: item.fullDescription || item.description || item.shortDescription || 'eBay listing',
              shortDescription: item.shortDescription || item.description || 'eBay listing',
              price: item.price?.value ? parseFloat(item.price.value) : 0,
              quantity: item.availableQuantity || 1,
              availableQuantity: item.availableQuantity || 1,
              condition: 'Used',
              category: item.categories?.[0]?.categoryName || 'eBay Listing',
              images: images,
              sku: item.mpn || item.itemId || '',
              mpn: item.mpn || '',
              status: 'active',
              marketplace: 'ebay',
              userId: userId,
              createdAt: item.itemCreationDate || new Date().toISOString(),
              itemCreationDate: item.itemCreationDate || new Date().toISOString(),
              startTime: item.itemCreationDate || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncedAt: new Date().toISOString(),
              itemWebUrl: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId || ''}`
            };
            
            console.log(`📦 Processed listing: ${product.name} - $${product.price}`);
            return product;
          });
          
          syncResults.importedListings = actualSyncedProducts.length;
          console.log(`✅ Successfully processed ${actualSyncedProducts.length} listings from internal API`);
        } else {
          console.log('📝 No listings returned from internal API');
        }
      } else {
        console.log(`⚠️ Internal listings API failed: ${listingsResponse.status}`);
        const errorText = await listingsResponse.text();
        console.log('Listings API error:', errorText.substring(0, 200));
      }
      
    } catch (listingsError) {
      console.error('Error calling internal listings API:', listingsError);
      syncResults.errors.push(`Failed to fetch listings: ${listingsError.message}`);
    }

    // Step 2: Fetch recent orders/sales
    console.log('📥 Fetching eBay orders...');
    try {
      const ordersResponse = await fetch('https://api.ebay.com/sell/fulfillment/v1/order?filter=orderfulfillmentstatus%3A%7BFULFILLED%7D&limit=50', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];
        console.log(`✅ Found ${orders.length} recent orders`);

        for (const order of orders) {
          try {
            // Process each order
            syncResults.importedOrders++;
            console.log(`💰 Processed order: ${order.orderId}`);
          } catch (orderError) {
            console.error('Error processing order:', orderError);
            syncResults.errors.push(`Failed to process order: ${orderError.message}`);
          }
        }
      } else {
        console.log('📝 No orders found or API unavailable');
      }

    } catch (ordersError) {
      console.error('Error fetching eBay orders:', ordersError);
      syncResults.errors.push(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Step 3: Store the actual synced data
    console.log('🔄 Storing synced eBay data...');
    
    // Store actual synced data for this user (in a real app, this would go to your database)
    global.userProducts = global.userProducts || {};
    global.userProducts[userId] = actualSyncedProducts;
    
    console.log(`💾 Stored ${actualSyncedProducts.length} synced products for user: ${userId}`);
    console.log('Global store now contains users:', Object.keys(global.userProducts));
    
    // CRITICAL: Store synced data in the format that Dashboard expects
    // This is what makes the Dashboard show real data after sync
    if (actualSyncedProducts.length > 0) {
      console.log(`📋 Storing sync data for Dashboard to access via localStorage format`);
      
      // Return the synced products in the response so the Dashboard can store them
      // The Dashboard will store these in localStorage as `ebay_sync_data_${userId}`
    } else {
      console.log(`📋 No synced products to store - Dashboard will show empty state`);
    }
    
    syncResults.importedListings = actualSyncedProducts.filter(p => p.status === 'active').length;
    syncResults.importedOrders = actualSyncedProducts.filter(p => p.status === 'sold').length;
    syncResults.updatedProducts = actualSyncedProducts.length;

    console.log('✅ eBay sync completed - no demo data, showing real results (may be empty)');

    // Return sync results with actual synced data (may be empty)
    return res.status(200).json({
      success: true,
      message: actualSyncedProducts.length > 0 ? 
        `eBay sync completed successfully with ${actualSyncedProducts.length} products` :
        'eBay sync completed - no products found. This may be because your eBay account has no active listings or requires business seller status.',
      results: syncResults,
      syncedProducts: actualSyncedProducts, // Include the actual synced products (may be empty)
      summary: {
        totalProducts: syncResults.updatedProducts,
        activeListings: syncResults.importedListings,
        soldItems: syncResults.importedOrders,
        lastSync: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in eBay sync:', error);
    return res.status(500).json({
      success: false,
      error: 'eBay sync failed',
      message: error.message || 'An unexpected error occurred during sync',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
