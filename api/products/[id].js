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
    // Get authorization header (optional for demo)
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }
    
    // For demo purposes, we'll allow requests without auth
    // In production, you would enforce authentication here
    
    const productId = req.query.id;
    
    console.log('=== Dynamic Route Debug ===');
    console.log('Product ID API called:', productId, 'Method:', req.method);
    console.log('req.query:', req.query);
    console.log('req.url:', req.url);
    console.log('req.body:', req.body);
    console.log('=========================');

    if (req.method === 'GET') {
      // Get specific product
      // In a real app, this would fetch from database
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

    if (req.method === 'PUT') {
      // Update product
      console.log('Updating product:', productId, req.body);
      
      // In a real app, you would update in database
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
        images: [], // In a real app, you'd handle file uploads
        status: 'ACTIVE',
        listings: [],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        updatedAt: new Date().toISOString()
      };

      console.log('✅ Product updated successfully:', updatedProduct);
      return res.status(200).json(updatedProduct);
    }

    if (req.method === 'DELETE') {
      // Delete product
      console.log('Deleting product:', productId);
      
      // In a real app, you would delete from database
      console.log('✅ Product deleted successfully');
      return res.status(200).json({ 
        message: 'Product deleted successfully',
        id: productId 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in product ID API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
