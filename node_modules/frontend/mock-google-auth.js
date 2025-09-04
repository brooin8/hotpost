// Mock Backend Server for Google OAuth Testing
// Run this with: node mock-google-auth.js

import express from 'express';
import cors from 'cors';
const app = express();

app.use(cors());
app.use(express.json());

// Mock Google OAuth endpoint
app.post('/auth/google', async (req, res) => {
  console.log('Google OAuth request received:', req.body);
  
  const { googleId, email, name, firstName, lastName, picture } = req.body;
  
  // Simulate database operation delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock response - in real app, you'd verify the Google token and create/find user
  const mockUser = {
    id: googleId || 'mock-user-id',
    email: email || 'user@example.com',
    firstName: firstName || 'John',
    lastName: lastName || 'Doe',
    picture: picture || null
  };
  
  const mockJWT = 'mock-jwt-token-' + Date.now();
  
  res.json({
    access_token: mockJWT,
    user: mockUser,
    message: 'Google OAuth successful (mock response)'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mock Google OAuth server running' });
});

// Mock products endpoint
app.get('/products', async (req, res) => {
  console.log('Products request received');
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock product data
  const mockProducts = [
    {
      id: '1',
      title: 'Vintage Leather Jacket',
      description: 'Authentic vintage leather jacket from the 1980s',
      price: 129.99,
      quantity: 1,
      sku: 'VLJ-001',
      images: [{ url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300' }],
      status: 'active',
      listings: [
        { marketplace: 'EBAY', status: 'active' },
        { marketplace: 'ETSY', status: 'draft' }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: '2', 
      title: 'Handmade Ceramic Mug',
      description: 'Beautiful handcrafted ceramic mug with unique glaze',
      price: 24.95,
      quantity: 5,
      sku: 'HCM-002',
      images: [{ url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=300' }],
      status: 'active',
      listings: [
        { marketplace: 'ETSY', status: 'active' },
        { marketplace: 'WHATNOT', status: 'pending' }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Collectible Trading Cards Pack',
      description: 'Rare trading cards from the 1990s series',
      price: 89.99,
      quantity: 3,
      sku: 'CTC-003',
      images: [{ url: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=300' }],
      status: 'active',
      listings: [
        { marketplace: 'EBAY', status: 'active' },
        { marketplace: 'WHATNOT', status: 'active' }
      ],
      createdAt: new Date().toISOString()
    }
  ];
  
  res.json(mockProducts);
});

// Mock dashboard metrics endpoint
app.get('/dashboard/metrics', async (req, res) => {
  console.log('Dashboard metrics request received');
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const mockMetrics = {
    totalProducts: 15,
    activeListings: 28,
    totalSales: 47,
    totalRevenue: 2847.50,
    totalViews: 1234,
    costSaved: 45.60,
    recentActivity: [
      {
        id: '1',
        type: 'listing_created',
        message: 'New listing created for',
        marketplace: 'eBay',
        timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        id: '2',
        type: 'product_sold',
        message: 'Product sold on',
        marketplace: 'Etsy',
        timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      },
      {
        id: '3',
        type: 'listing_renewed',
        message: 'Smart renewal completed on',
        marketplace: 'Etsy',
        timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }
    ]
  };
  
  res.json(mockMetrics);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🎭 Mock Google OAuth server running on http://localhost:${PORT}`);
  console.log(`📋 Test endpoint: POST http://localhost:${PORT}/auth/google`);
  console.log('');
  console.log('To test Google OAuth:');
  console.log('1. Set up Google OAuth credentials in Google Cloud Console');
  console.log('2. Update your .env file with VITE_GOOGLE_CLIENT_ID');
  console.log('3. Start your frontend: npm run dev');
  console.log('4. Try the Google sign-in button on /signup');
});

export default app;
