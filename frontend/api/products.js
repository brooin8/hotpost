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
      console.log('Products API called with token:', token.substring(0, 20) + '...');
    } else {
      console.log('Products API called without auth (demo mode)');
    }
    
    // For demo purposes, we'll allow requests without auth
    // In production, you would enforce authentication here

    // Since this is a demo app, we'll simulate product operations
    // In a real app, this would connect to a database

    if (req.method === 'GET') {
      // Return demo products or eBay listings
      const demoProducts = [
        {
          id: '1',
          title: 'Vintage Leather Jacket - Brown Size M',
          description: 'Beautiful vintage leather jacket in excellent condition. Perfect for casual wear or special occasions. Features genuine leather construction with classic brown finish.',
          price: 89.99,
          quantity: 1,
          sku: 'VLJ-001',
          brand: 'Vintage Collection',
          condition: 'very_good',
          tags: ['vintage', 'leather', 'jacket', 'brown', 'medium'],
          images: [{ url: 'https://via.placeholder.com/400x400/8B4513/ffffff?text=Vintage+Jacket' }],
          status: 'ACTIVE',
          listings: [
            { marketplace: 'EBAY', status: 'ACTIVE' },
            { marketplace: 'ETSY', status: 'ACTIVE' }
          ],
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Wireless Bluetooth Headphones',
          description: 'High-quality wireless headphones with active noise cancellation. Perfect for music, calls, and travel. Long battery life and comfortable design.',
          price: 129.99,
          quantity: 5,
          sku: 'WBH-002',
          brand: 'TechSound',
          condition: 'new',
          tags: ['wireless', 'bluetooth', 'headphones', 'noise-cancellation'],
          images: [{ url: 'https://via.placeholder.com/400x400/000080/ffffff?text=Headphones' }],
          status: 'ACTIVE',
          listings: [
            { marketplace: 'EBAY', status: 'ACTIVE' }
          ],
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      return res.status(200).json(demoProducts);
    }

    if (req.method === 'POST') {
      // Create new product
      console.log('Creating new product:', req.body);
      
      // In a real app, you would save to database
      const newProduct = {
        id: Date.now().toString(),
        title: req.body.title || 'New Product',
        description: req.body.description || 'No description',
        price: parseFloat(req.body.price) || 0,
        quantity: parseInt(req.body.quantity) || 1,
        sku: req.body.sku || `PROD-${Date.now()}`,
        brand: req.body.brand || '',
        condition: req.body.condition || 'new',
        tags: typeof req.body.tags === 'string' ? JSON.parse(req.body.tags || '[]') : (req.body.tags || []),
        images: [], // In a real app, you'd handle file uploads
        status: 'ACTIVE',
        listings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('✅ Product created successfully:', newProduct);
      return res.status(201).json(newProduct);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in products API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
