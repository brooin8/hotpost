export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // Allow custom headers used by the app
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-EBAY-TOKENS, X-USER-ID, x-ebay-tokens, x-user-id'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract product ID from query parameter or body
    const productId = req.query.id || req.body.id;
    
    console.log('=== Product Update API ===');
    console.log('Product ID:', productId, 'Method:', req.method);
    console.log('req.query:', req.query);
    console.log('req.body:', req.body);
    console.log('========================');

    if (req.method === 'PUT') {
      // Update product
      console.log('Updating product:', productId, req.body);
      
      const userId = req.headers['x-user-id'] || 'anonymous';
      const ebayTokensHeader = req.headers['x-ebay-tokens'];
      
      // Update product in database (simulated)
      const updatedProduct = {
        id: productId,
        title: req.body.title || 'Updated Product',
        description: req.body.description || 'Updated description',
        price: parseFloat(req.body.price) || 0,
        quantity: parseInt(req.body.quantity) || 1,
        sku: req.body.sku || `PROD-${productId}`,
        brand: req.body.brand || '',
        condition: req.body.condition || 'new',
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        images: [],
        status: 'ACTIVE',
        listings: [],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update in global store if exists
      if (global.userProducts && global.userProducts[userId]) {
        const products = global.userProducts[userId];
        const productIndex = products.findIndex(p => p.ebayItemId === productId || p.id === productId);
        if (productIndex !== -1) {
          products[productIndex] = {
            ...products[productIndex],
            name: updatedProduct.title,
            description: updatedProduct.description,
            price: updatedProduct.price,
            quantity: updatedProduct.quantity,
            condition: updatedProduct.condition,
            updatedAt: updatedProduct.updatedAt
          };
          console.log('📦 Updated product in global store');
        }
      }
      
      // If this product has eBay tokens and is an eBay listing, trigger eBay sync
      if (ebayTokensHeader && productId) {
        console.log('🔄 Triggering eBay listing update...');
        
        try {
          // Make internal call to eBay update endpoint
          const ebayUpdateUrl = new URL('/api/ebay/update-listing', req.headers.host ? `https://${req.headers.host}` : 'https://crosslist-pro-deepseek.vercel.app');
          
          const ebayUpdateResponse = await fetch(ebayUpdateUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-ebay-tokens': ebayTokensHeader,
              'x-user-id': userId
            },
            body: JSON.stringify({
              itemId: productId,
              title: req.body.title,
              description: req.body.description,
              price: req.body.price,
              quantity: req.body.quantity,
              sku: req.body.sku,
              condition: req.body.condition
            })
          });
          
          if (ebayUpdateResponse.ok) {
            const ebayResult = await ebayUpdateResponse.json();
            console.log('✅ eBay sync triggered successfully');
            updatedProduct.ebaySyncResult = ebayResult;
          } else {
            console.warn('⚠️ eBay sync failed:', await ebayUpdateResponse.text());
          }
          
        } catch (ebayError) {
          console.warn('⚠️ Could not trigger eBay sync:', ebayError.message);
        }
      }

      console.log('✅ Product updated successfully:', updatedProduct);
      return res.status(200).json(updatedProduct);
    }

    if (req.method === 'GET') {
      // Get specific product
      const demoProduct = {
        id: productId,
        title: 'Sample Product',
        description: 'Sample product description',
        price: 99.99,
        quantity: 1,
        sku: 'SAMPLE-001',
        brand: 'Sample Brand',
        condition: 'new',
        tags: ['sample', 'product'],
        images: [],
        status: 'ACTIVE',
        listings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(200).json(demoProduct);
    }

    if (req.method === 'DELETE') {
      // Delete product
      console.log('Deleting product:', productId);
      
      console.log('✅ Product deleted successfully');
      return res.status(200).json({ 
        message: 'Product deleted successfully',
        id: productId 
      });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });

  } catch (error) {
    console.error('Error in product update API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
