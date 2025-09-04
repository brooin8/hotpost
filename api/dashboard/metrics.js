export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // Allow custom headers used by the app (case-insensitive duplicates to satisfy different environments)
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-EBAY-TOKENS, X-USER-ID, x-ebay-tokens, x-user-id'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Fetching Dashboard Metrics ===');
    
    // Get eBay listings data
    let ebayListings = [];
    try {
      // Check if eBay tokens are available in the request headers
      const ebayTokens = req.headers['x-ebay-tokens'] || req.query.ebayTokens;
      
      if (ebayTokens) {
        // In a real implementation, you would fetch actual eBay data here
        console.log('eBay tokens found, but no real API integration yet - returning empty data');
        // Return empty array - real data would come from actual eBay API calls
        ebayListings = [];
      } else {
        console.log('No eBay tokens provided, returning empty data');
        ebayListings = [];
      }
    } catch (error) {
      console.error('Error fetching eBay data:', error);
    }

    // Calculate metrics from the data
    const totalProducts = ebayListings.length;
    const activeListings = ebayListings.filter(item => item.status === 'ACTIVE').length;
    const unsoldListings = ebayListings.filter(item => item.status === 'ENDED').length;
    const soldItems = ebayListings.filter(item => item.status === 'SOLD');
    const totalSales = soldItems.length;
    const totalRevenue = soldItems.reduce((sum, item) => sum + parseFloat(item.price.value), 0);
    const totalViews = ebayListings.reduce((sum, item) => sum + (item.viewCount || 0), 0);
    const totalWatches = ebayListings.reduce((sum, item) => sum + (item.watchCount || 0), 0);

    // Calculate estimated cost saved (assuming $0.20 per listing renewal fee saved)
    const gtcListings = ebayListings.filter(item => item.listingDuration === 'GTC').length;
    const costSaved = gtcListings * 0.20; // Rough estimate of fees saved

    // Generate recent activity from the listings
    const recentActivity = [];
    
    // Add sold items as completed sales
    soldItems.forEach(item => {
      recentActivity.push({
        id: `sale_${item.itemId}`,
        type: 'SALE_COMPLETED',
        message: `Sold ${item.title.substring(0, 40)}${item.title.length > 40 ? '...' : ''} for $${item.price.value}`,
        marketplace: 'eBay',
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    });

    // Add recent listings with listing dates and days listed calculation
    const recentListings = ebayListings
      .filter(item => item.status === 'ACTIVE')
      .sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime())
      .slice(0, 3);

    recentListings.forEach(item => {
      // Calculate days listed since creation
      const listingStartDate = new Date(item.creationTime);
      const currentDate = new Date();
      const daysListed = Math.floor((currentDate.getTime() - listingStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      recentActivity.push({
        id: `listing_${item.itemId}`,
        type: 'LISTING_CREATED',
        message: `Listed ${item.title.substring(0, 40)}${item.title.length > 40 ? '...' : ''} for $${item.price.value}`,
        marketplace: 'eBay',
        timestamp: item.creationTime,
        startDate: item.creationTime,
        daysListed: daysListed
      });
    });

    // Sort activity by timestamp (most recent first)
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to 5 most recent activities
    const limitedActivity = recentActivity.slice(0, 5);

    // Calculate additional metrics to match eBay structure
    const averagePrice = totalProducts > 0 ? ebayListings.reduce((sum, item) => sum + parseFloat(item.price.value), 0) / totalProducts : 0;
    const conversionRate = totalViews > 0 ? (totalSales / totalViews * 100) : 0;
    const watchToViewRatio = totalViews > 0 ? (totalWatches / totalViews * 100) : 0;
    const totalInventoryValue = ebayListings.filter(item => item.status === 'ACTIVE').reduce((sum, item) => sum + parseFloat(item.price.value), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const dashboardMetrics = {
      // Main KPIs (matching eBay seller overview)
      active: activeListings,
      orders: totalSales,
      unsold: unsoldListings,
      ninetyDayTotal: totalRevenue,
      
      // Financial metrics
      netSales: totalRevenue * 0.85, // Estimate after fees
      totalFees: totalRevenue * 0.15, // Estimate 15% fees
      averageOrderValue,
      feeRate: 15.0,
      
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
        { name: 'Electronics', listings: Math.floor(totalProducts * 0.6), views: Math.floor(totalViews * 0.6), sales: Math.floor(totalSales * 0.6), revenue: totalRevenue * 0.6 },
        { name: 'Computers', listings: Math.floor(totalProducts * 0.4), views: Math.floor(totalViews * 0.4), sales: Math.floor(totalSales * 0.4), revenue: totalRevenue * 0.4 }
      ] : [],
      categoryCount: totalProducts > 0 ? 2 : 0,
      
      // Recent activity
      recentActivity: limitedActivity,
      
      // Insights - only show if we have meaningful data
      insights: totalProducts > 0 ? [
        conversionRate > 2 ? 
          { type: 'positive', message: `Good conversion rate of ${conversionRate.toFixed(1)}%` } :
          { type: 'warning', message: `Low conversion rate: ${conversionRate.toFixed(1)}%. Consider optimizing titles and prices.` },
        
        watchToViewRatio > 10 ?
          { type: 'positive', message: `Strong interest: ${watchToViewRatio.toFixed(1)}% of viewers are watching items` } :
          { type: 'info', message: `${watchToViewRatio.toFixed(1)}% watch rate. Consider improving photos and descriptions.` }
      ] : [],
      
      // Trends (estimated based on data)
      trends: {
        salesTrend: totalSales >= 2 ? 'up' : 'stable',
        viewsTrend: totalViews > 500 ? 'up' : 'stable',
        priceTrend: averagePrice > 500 ? 'premium' : 'value'
      },
      
      // Legacy fields
      costSaved,
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Dashboard metrics calculated:', {
      totalProducts,
      activeListings, 
      totalSales,
      totalRevenue: totalRevenue.toFixed(2),
      totalViews,
      activitiesCount: limitedActivity.length
    });

    return res.status(200).json(dashboardMetrics);

  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
