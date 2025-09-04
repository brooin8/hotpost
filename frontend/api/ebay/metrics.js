export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-EBAY-TOKENS, X-USER-ID, x-ebay-tokens, x-user-id'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== eBay Metrics API ===');
    
    const userId = req.headers['x-user-id'] || 'anonymous';
    console.log('Fetching eBay metrics for user:', userId);
    
    let ebayListings = [];
    
    // Check if we have synced products data (from POST request body)
    if (req.method === 'POST' && req.body?.syncedProducts) {
      ebayListings = req.body.syncedProducts;
      console.log(`📦 Using ${ebayListings.length} synced products from request body`);
    } else {
      // Check if data exists in global store (from sync API)
      if (global.userProducts && global.userProducts[userId]) {
        ebayListings = global.userProducts[userId];
        console.log(`📦 Found ${ebayListings.length} products in global store for user: ${userId}`);
      } else {
        console.log('No synced data found, returning empty data until user syncs their eBay account');
        // Return empty data - real data will come from actual eBay sync
        ebayListings = [];
      }
    }

    // Calculate metrics from the data
    const totalProducts = ebayListings.length;
    const activeListings = ebayListings.filter(item => item.status === 'active').length;
    const unsoldListings = ebayListings.filter(item => item.status === 'unsold').length;
    const soldItems = ebayListings.filter(item => item.status === 'sold');
    const totalSales = soldItems.length;
    const totalRevenue = soldItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const totalViews = ebayListings.reduce((sum, item) => sum + (item.viewCount || 0), 0);
    const totalWatches = ebayListings.reduce((sum, item) => sum + (item.watchCount || 0), 0);

    // Calculate additional metrics
    const averagePrice = activeListings > 0 ? 
      ebayListings.filter(item => item.status === 'active').reduce((sum, item) => sum + parseFloat(item.price), 0) / activeListings : 0;
    const conversionRate = totalViews > 0 ? (totalSales / totalViews * 100) : 0;
    const watchToViewRatio = totalViews > 0 ? (totalWatches / totalViews * 100) : 0;
    const totalInventoryValue = ebayListings.filter(item => item.status === 'active').reduce((sum, item) => sum + parseFloat(item.price), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Generate recent activity from the listings
    const recentActivity = [];
    
    // Add sold items as completed sales
    soldItems.forEach(item => {
      recentActivity.push({
        id: `sale_${item.ebayItemId}`,
        type: 'SALE_COMPLETED',
        message: `Sold ${item.name.substring(0, 40)}${item.name.length > 40 ? '...' : ''} for $${item.price}`,
        marketplace: 'eBay',
        timestamp: item.updatedAt
      });
    });

    // Add recent listings
    const recentListings = ebayListings
      .filter(item => item.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    recentListings.forEach(item => {
      recentActivity.push({
        id: `listing_${item.ebayItemId}`,
        type: 'LISTING_CREATED',
        message: `Listed ${item.name.substring(0, 40)}${item.name.length > 40 ? '...' : ''} for $${item.price}`,
        marketplace: 'eBay',
        timestamp: item.createdAt
      });
    });

    // Sort activity by timestamp (most recent first)
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const dashboardMetrics = {
      // Main KPIs (matching real eBay: 6 active, 1 order, 5 unsold, $373.19 total)
      active: activeListings,
      orders: totalSales,
      unsold: unsoldListings,
      ninetyDayTotal: totalRevenue,
      
      // Financial metrics
      netSales: totalRevenue * 0.87, // Estimate after eBay fees (13%)
      totalFees: totalRevenue * 0.13, // Estimate 13% fees
      averageOrderValue,
      feeRate: 13.0,
      
      // Inventory metrics
      totalInventoryValue,
      averagePrice,
      outOfStockItems: 0,
      
      // Performance metrics
      totalViews,
      totalWatchers: totalWatches,
      conversionRate,
      averageViewsPerListing: totalProducts > 0 ? totalViews / totalProducts : 0,
      watchToViewRatio,
      
      // Category insights - only show if we have data
      topCategories: totalProducts > 0 ? [
        { 
          name: 'Electronics', 
          listings: totalProducts, 
          views: totalViews, 
          sales: totalSales, 
          revenue: totalRevenue 
        }
      ] : [],
      categoryCount: totalProducts > 0 ? 1 : 0,
      
      // Recent activity (limited to 5 most recent)
      recentActivity: recentActivity.slice(0, 5),
      
      // Insights - only show if we have meaningful data
      insights: totalProducts > 0 ? [
        conversionRate > 2 ? 
          { type: 'positive', message: `Good conversion rate of ${conversionRate.toFixed(1)}%` } :
          { type: 'warning', message: `Low conversion rate: ${conversionRate.toFixed(1)}%. Consider optimizing titles and prices.` },
        
        watchToViewRatio > 10 ?
          { type: 'positive', message: `Strong interest: ${watchToViewRatio.toFixed(1)}% of viewers are watching items` } :
          { type: 'info', message: `${watchToViewRatio.toFixed(1)}% watch rate. Consider improving photos and descriptions.` }
      ] : [],
      
      // Trends
      trends: {
        salesTrend: totalSales >= 1 ? 'up' : 'stable',
        viewsTrend: totalViews > 800 ? 'up' : 'stable',
        priceTrend: averagePrice > 100 ? 'premium' : 'value'
      },
      
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ eBay metrics calculated:', {
      totalProducts,
      activeListings, 
      unsoldListings,
      totalSales,
      totalRevenue: totalRevenue.toFixed(2),
      totalViews,
      activitiesCount: recentActivity.length
    });

    return res.status(200).json(dashboardMetrics);

  } catch (error) {
    console.error('Error calculating eBay metrics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
