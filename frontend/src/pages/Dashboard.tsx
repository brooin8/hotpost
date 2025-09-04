import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CurrencyDollarIcon, 
  ShoppingBagIcon,
  EyeIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  TagIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

// Utility function to get consistent user ID across dashboard and sync operations
const getUserId = (): string => {
  let userId = localStorage.getItem('user_id');
  
  // If no direct user_id, try to extract from user object
  if (!userId) {
    const userObj = localStorage.getItem('user');
    if (userObj) {
      try {
        const parsedUser = JSON.parse(userObj);
        userId = parsedUser.id || parsedUser.email || null;
        console.log('Extracted user ID from user object:', userId);
      } catch (e) {
        console.warn('Could not parse user object:', e);
      }
    }
  }
  
  // Generate eBay user ID if needed
  const ebayTokens = localStorage.getItem('ebay_tokens');
  if (!userId || userId === 'anonymous') {
    if (ebayTokens) {
      try {
        const tokens = JSON.parse(ebayTokens);
        const tokenHash = btoa(tokens.access_token?.substring(0, 20) || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        userId = `ebay_user_${tokenHash}`;
        localStorage.setItem('user_id', userId);
        console.log('Generated stable user ID:', userId);
      } catch (e) {
        userId = `ebay_user_${Date.now()}`;
        localStorage.setItem('user_id', userId);
      }
    } else {
      userId = 'anonymous';
    }
  }
  
  return userId;
};

interface DashboardMetrics {
  // Main KPIs
  active: number;
  orders: number;
  unsold: number;
  ninetyDayTotal: number;
  
  // Financial metrics
  netSales: number;
  totalFees: number;
  averageOrderValue: number;
  feeRate: number;
  
  // Inventory metrics
  totalInventoryValue: number;
  averagePrice: number;
  outOfStockItems: number;
  
  // Performance metrics
  totalViews: number;
  totalWatchers: number;
  conversionRate: number;
  averageViewsPerListing: number;
  watchToViewRatio: number;
  
  // Category insights
  topCategories: Array<{
    name: string;
    listings: number;
    views: number;
    sales: number;
    revenue: number;
  }>;
  categoryCount: number;
  
  // Activity and insights
  recentActivity: Activity[];
  insights: Array<{
    type: 'positive' | 'warning' | 'info';
    message: string;
  }>;
  
  trends: {
    salesTrend: 'up' | 'down' | 'stable';
    viewsTrend: 'up' | 'down' | 'stable';
    priceTrend: 'premium' | 'value';
  };
  
  // Optional legacy field
  costSaved?: number;
  
  lastUpdated: string;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  details?: string;
  marketplace: string;
  timestamp: string;
  amount?: number;
  startDate?: string; // eBay listing start date
  daysListed?: number; // Calculated days since listing started
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    active: 0,
    orders: 0,
    unsold: 0,
    ninetyDayTotal: 0,
    netSales: 0,
    totalFees: 0,
    averageOrderValue: 0,
    feeRate: 0,
    totalInventoryValue: 0,
    averagePrice: 0,
    outOfStockItems: 0,
    totalViews: 0,
    totalWatchers: 0,
    conversionRate: 0,
    averageViewsPerListing: 0,
    watchToViewRatio: 0,
    topCategories: [],
    categoryCount: 0,
    recentActivity: [],
    insights: [],
    trends: { salesTrend: 'stable', viewsTrend: 'stable', priceTrend: 'value' },
    lastUpdated: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching real-time dashboard data...');
      
      // Use the same user ID logic as sync
      const userId = getUserId();
      console.log('Fetching data for user:', userId);
      
      // Clear cached metrics to ensure fresh data
      localStorage.removeItem('dashboard_metrics');
      
      // Prefer the main auth token key used by the axios interceptor
      const authToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
      // Try both localStorage and sessionStorage for eBay tokens
      const ebayTokens = localStorage.getItem('ebay_tokens') || sessionStorage.getItem('ebay_tokens');
      
      const headers: any = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      };
      
      // Add user identification headers
      if (userId) {
        headers['x-user-id'] = userId;
      }
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const hasEbayConnection = ebayTokens && ebayTokens !== 'null' && ebayTokens.length > 10;
      
      if (hasEbayConnection) {
        console.log('🔗 eBay connection detected, fetching real inventory data for user:', userId);
        headers['x-ebay-tokens'] = ebayTokens;
        
        // Force fresh sync data if we have eBay tokens
        try {
          // Check if we have locally stored sync data to send to the metrics API
          let storedSyncData = localStorage.getItem(`ebay_sync_data_${userId}`);
          
          // If no data found for current userId, try common variations
          if (!storedSyncData) {
            console.log(`No sync data found for ${userId}, checking alternative keys...`);
            
            // Check for anonymous data
            const anonymousData = localStorage.getItem('ebay_sync_data_anonymous');
            if (anonymousData) {
              console.log('Found sync data stored under "anonymous" key, using it');
              storedSyncData = anonymousData;
            }
            
            // If still no data, check all localStorage keys for any ebay_sync_data
            if (!storedSyncData) {
              const allKeys = Object.keys(localStorage);
              const syncDataKeys = allKeys.filter(key => key.startsWith('ebay_sync_data_'));
              console.log('Available sync data keys:', syncDataKeys);
              
              if (syncDataKeys.length > 0) {
                // Use the most recent sync data
                const latestKey = syncDataKeys[syncDataKeys.length - 1];
                storedSyncData = localStorage.getItem(latestKey);
                console.log(`Using sync data from key: ${latestKey}`);
              }
            }
          }
          
          // Use fresh API call to eBay metrics (priority path)
          if (storedSyncData) {
            try {
              const syncedProducts = JSON.parse(storedSyncData);
              
              // Check if this is cached demo data and remove it
              const hasDemoData = syncedProducts.some((p: any) => 
                p.name && p.name.includes('Electronics Component')
              );
              
              if (hasDemoData) {
                console.log('🧹 Detected cached demo data, clearing it...');
                // Clear all cached sync data keys
                const allKeys = Object.keys(localStorage);
                const syncDataKeys = allKeys.filter(key => key.startsWith('ebay_sync_data_'));
                syncDataKeys.forEach(key => localStorage.removeItem(key));
                
                // Continue without cached data to force fresh sync
                storedSyncData = null;
              } else {
                console.log(`📦 Found ${syncedProducts.length} stored sync products, sending fresh to metrics API`);
                
                // Force refresh by calling metrics with fresh=true parameter
                const response = await api.post('/ebay/metrics?refresh=true', { 
                  syncedProducts,
                  forceRefresh: true 
                }, { headers });
                
                if (response.data && response.data.totalInventoryValue > 0) {
                  console.log('✅ Real eBay metrics retrieved successfully:', response.data);
                  setMetrics(response.data);
                  return;
                }
              }
            } catch (parseError) {
              console.warn('Could not parse stored sync data:', parseError);
            }
          }
          
          // Fallback: Direct API call without cached sync data
          console.log('🔄 Making direct eBay metrics API call...');
          const response = await api.get('/ebay/metrics?refresh=true', { headers });
          
          if (response.data && (response.data.totalInventoryValue > 0 || response.data.active > 0)) {
            console.log('✅ Direct eBay metrics successful:', response.data);
            setMetrics(response.data);
            return;
          } else {
            console.log('⚠️ eBay metrics returned empty data, user may need to sync');
          }
        } catch (ebayError) {
          console.error('❌ eBay metrics API failed:', ebayError);
        }
      } else {
        console.log('ℹ️ No eBay connection detected - user needs to connect eBay first');
      }
      
      // If no eBay connection, show zeros to indicate need for connection
      if (!hasEbayConnection) {
        console.log('📝 No eBay connection - showing zeros to indicate need for connection');
        
        const connectPromptMetrics: DashboardMetrics = {
          active: 0,
          orders: 0,
          unsold: 0,
          ninetyDayTotal: 0,
          netSales: 0,
          totalFees: 0,
          averageOrderValue: 0,
          feeRate: 0,
          totalInventoryValue: 0,
          averagePrice: 0,
          outOfStockItems: 0,
          totalViews: 0,
          totalWatchers: 0,
          conversionRate: 0,
          averageViewsPerListing: 0,
          watchToViewRatio: 0,
          topCategories: [],
          categoryCount: 0,
          recentActivity: [],
          insights: [{ 
            type: 'info', 
            message: 'Connect your eBay account to see real inventory data and metrics!' 
          }],
          trends: { salesTrend: 'stable', viewsTrend: 'stable', priceTrend: 'value' },
          lastUpdated: new Date().toISOString()
        };
        setMetrics(connectPromptMetrics);
        return;
      }
      
      // If eBay connection exists but API failed, try direct API call for demo data
      if (hasEbayConnection) {
        console.log('eBay connected but API failed, trying direct API call for demo data...');
        
        try {
          // Try calling the dashboard metrics API directly with eBay tokens for demo data
          const response = await api.get('/dashboard/metrics', { headers });
          
          if (response.data) {
            console.log('✅ Dashboard metrics API successful with demo data:', response.data);
            setMetrics(response.data);
            return;
          }
        } catch (apiError) {
          console.log('Dashboard metrics API also failed, trying local calculation...');
        }
        
        // Try to get stored sync data and calculate basic metrics
        let storedSyncData = localStorage.getItem(`ebay_sync_data_${userId}`);
        
        if (!storedSyncData) {
          // Try alternative keys
          const alternativeKeys = [
            'ebay_sync_data_anonymous',
            ...Object.keys(localStorage).filter(key => key.startsWith('ebay_sync_data_'))
          ];
          
          for (const key of alternativeKeys) {
            const data = localStorage.getItem(key);
            if (data && data !== 'null') {
              storedSyncData = data;
              console.log(`Using sync data from key: ${key}`);
              break;
            }
          }
        }
        
        if (storedSyncData) {
          try {
            const syncedProducts = JSON.parse(storedSyncData);
            console.log(`Calculating metrics from ${syncedProducts.length} synced products`);
            
            // Calculate basic metrics from synced data
            const activeProducts = syncedProducts.filter((p: any) => p.status !== 'INACTIVE');
            const totalValue = activeProducts.reduce((sum: number, p: any) => {
              const price = parseFloat(p.price?.value || p.price || 0);
              const quantity = parseInt(p.availableQuantity || p.quantity || 0);
              return sum + (price * quantity);
            }, 0);
            
            const avgPrice = activeProducts.length > 0 ? totalValue / activeProducts.length : 0;
            
            // Generate recent activity from synced products
            const recentActivity: Activity[] = [];
            
            // Add recent listings with listing dates and days listed calculation
            // Show ALL active products in recent activity, not just 5
            const recentListings = activeProducts
              .filter((p: any) => p.creationTime || p.startTime || p.listingDate || p.itemCreationDate || p.createdAt)
              .sort((a: any, b: any) => {
                const dateA = new Date(a.creationTime || a.startTime || a.listingDate || a.itemCreationDate || a.createdAt || 0).getTime();
                const dateB = new Date(b.creationTime || b.startTime || b.listingDate || b.itemCreationDate || b.createdAt || 0).getTime();
                return dateB - dateA; // Most recent first
              })
              // Show all products, not just 5 - let user see their full inventory activity
              .slice(0, Math.min(activeProducts.length, 50)); // Cap at 50 to avoid performance issues
            
            recentListings.forEach((product: any) => {
              const startDate = product.creationTime || product.startTime || product.listingDate || product.itemCreationDate || product.createdAt;
              if (startDate) {
                // Calculate days listed since creation
                const listingStartDate = new Date(startDate);
                const currentDate = new Date();
                const daysListed = Math.floor((currentDate.getTime() - listingStartDate.getTime()) / (1000 * 60 * 60 * 24));
                
                const price = parseFloat(product.price?.value || product.price || 0);
                
                recentActivity.push({
                  id: `listing_${product.itemId || product.id || Date.now()}`,
                  type: 'LISTING_CREATED',
                  message: `Listed ${(product.title || product.name || 'Item').substring(0, 40)}${(product.title || product.name || '').length > 40 ? '...' : ''} for $${price.toFixed(2)}`,
                  marketplace: 'eBay',
                  timestamp: startDate,
                  startDate: startDate,
                  daysListed: daysListed
                });
              }
            });
            
            const calculatedMetrics: DashboardMetrics = {
              active: activeProducts.length,
              orders: 0, // Would need order data
              unsold: syncedProducts.filter((p: any) => (p.availableQuantity || p.quantity || 0) === 0).length,
              ninetyDayTotal: 0, // Would need sales data
              netSales: 0,
              totalFees: 0,
              averageOrderValue: 0,
              feeRate: 0,
              totalInventoryValue: totalValue,
              averagePrice: avgPrice,
              outOfStockItems: syncedProducts.filter((p: any) => (p.availableQuantity || p.quantity || 0) === 0).length,
              totalViews: syncedProducts.reduce((sum: number, p: any) => sum + (p.totalViews || 0), 0),
              totalWatchers: syncedProducts.reduce((sum: number, p: any) => sum + (p.watcherCount || 0), 0),
              conversionRate: 0, // Would need sales/views data
              averageViewsPerListing: activeProducts.length > 0 ? syncedProducts.reduce((sum: number, p: any) => sum + (p.totalViews || 0), 0) / activeProducts.length : 0,
              watchToViewRatio: 0,
              topCategories: [],
              categoryCount: 0,
              recentActivity: recentActivity,
              insights: [{ 
                type: 'positive', 
                message: `Showing data from ${activeProducts.length} eBay listings. Metrics calculated from local sync data.` 
              }],
              trends: { salesTrend: 'stable', viewsTrend: 'stable', priceTrend: 'value' },
              lastUpdated: new Date().toISOString()
            };
            
            setMetrics(calculatedMetrics);
            console.log('✅ Metrics calculated from local sync data:', calculatedMetrics);
            return;
          } catch (parseError) {
            console.error('Error parsing stored sync data for metrics:', parseError);
          }
        }
      }
      
      // Final fallback: show error state
      const errorMetrics: DashboardMetrics = {
        active: 0,
        orders: 0,
        unsold: 0,
        ninetyDayTotal: 0,
        netSales: 0,
        totalFees: 0,
        averageOrderValue: 0,
        feeRate: 0,
        totalInventoryValue: 0,
        averagePrice: 0,
        outOfStockItems: 0,
        totalViews: 0,
        totalWatchers: 0,
        conversionRate: 0,
        averageViewsPerListing: 0,
        watchToViewRatio: 0,
        topCategories: [],
        categoryCount: 0,
        recentActivity: [],
        insights: [{ 
          type: 'warning', 
          message: 'Unable to fetch eBay data. Please try syncing your listings or reconnecting eBay.' 
        }],
        trends: { salesTrend: 'stable', viewsTrend: 'stable', priceTrend: 'value' },
        lastUpdated: new Date().toISOString()
      };
      setMetrics(errorMetrics);
    } catch (error) {
      console.error('❌ Critical error fetching dashboard data:', error);
      
      // Check if this is a first-time user without eBay connection
      const ebayTokens = localStorage.getItem('ebay_tokens');
      const hasEbayConnection = ebayTokens && ebayTokens !== 'null' && ebayTokens.length > 10;
      
      if (!hasEbayConnection) {
        // First-time user - show welcome state
        const welcomeMetrics: DashboardMetrics = {
          active: 0,
          orders: 0,
          unsold: 0,
          ninetyDayTotal: 0,
          netSales: 0,
          totalFees: 0,
          averageOrderValue: 0,
          feeRate: 0,
          totalInventoryValue: 0,
          averagePrice: 0,
          outOfStockItems: 0,
          totalViews: 0,
          totalWatchers: 0,
          conversionRate: 0,
          averageViewsPerListing: 0,
          watchToViewRatio: 0,
          topCategories: [],
          categoryCount: 0,
          recentActivity: [],
          insights: [{ 
            type: 'info', 
            message: 'Welcome! Connect your eBay account to get started with real data.' 
          }],
          trends: { salesTrend: 'stable', viewsTrend: 'stable', priceTrend: 'value' },
          lastUpdated: new Date().toISOString()
        };
        setMetrics(welcomeMetrics);
      } else {
        // User has eBay connection but error occurred - show error state
        const errorStateMetrics: DashboardMetrics = {
          active: 0,
          orders: 0,
          unsold: 0,
          ninetyDayTotal: 0,
          netSales: 0,
          totalFees: 0,
          averageOrderValue: 0,
          feeRate: 0,
          totalInventoryValue: 0,
          averagePrice: 0,
          outOfStockItems: 0,
          totalViews: 0,
          totalWatchers: 0,
          conversionRate: 0,
          averageViewsPerListing: 0,
          watchToViewRatio: 0,
          topCategories: [],
          categoryCount: 0,
          recentActivity: [],
          insights: [{ 
            type: 'warning', 
            message: 'Error loading dashboard data. Please try refreshing or reconnecting eBay.' 
          }],
          trends: { salesTrend: 'stable', viewsTrend: 'stable', priceTrend: 'value' },
          lastUpdated: new Date().toISOString()
        };
        setMetrics(errorStateMetrics);
      }
    } finally {
      setLoading(false);
    }
  };

  const syncEbayData = async () => {
    try {
      setSyncing(true);
      console.log('Starting eBay data sync...');
      
      // Use the same user ID logic as dashboard fetch
      const userId = getUserId();
      console.log('Syncing for user ID:', userId);
      
      const authToken = localStorage.getItem('auth_token');
      const ebayTokens = localStorage.getItem('ebay_tokens');
      
      if (!ebayTokens) {
        alert('Please connect your eBay account first to sync data.');
        return;
      }
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      // Add user identification headers
      if (userId) {
        headers['x-user-id'] = userId;
      }
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      headers['x-ebay-tokens'] = ebayTokens;
      
      console.log('Syncing eBay data for user:', userId);
      
      const response = await api.post('/ebay/sync', {}, { headers });
      console.log('eBay sync response:', response.data);
      
      if (response.data.success) {
        const { results, syncedProducts } = response.data;
        
        // Store synced products in localStorage for metrics API
        if (syncedProducts && syncedProducts.length > 0) {
          localStorage.setItem(`ebay_sync_data_${userId}`, JSON.stringify(syncedProducts));
          console.log(`📦 Stored ${syncedProducts.length} synced products in localStorage for user ${userId}`);
        }
        
        alert(`eBay sync completed successfully!\n\nImported: ${results.importedListings} listings\nOrders: ${results.importedOrders}\nTotal products: ${results.updatedProducts}`);
        
        // Refresh dashboard data after sync
        await fetchDashboardData();
      } else {
        alert('eBay sync failed. Please try again.');
      }
    } catch (error: any) {
      console.error('eBay sync error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert(`eBay sync failed: ${errorMessage}`);
    } finally {
      setSyncing(false);
    }
  };

  // Safely access trends with defaults to prevent crashes
  const trends = metrics.trends || {
    salesTrend: 'stable' as const,
    viewsTrend: 'stable' as const,
    priceTrend: 'value' as const
  };

  // Main KPI stats (matching eBay seller overview)
  const mainStats = [
    {
      name: 'Active',
      value: metrics.active,
      icon: ShoppingBagIcon,
      trend: trends.salesTrend,
      color: 'blue'
    },
    {
      name: 'Orders',
      value: metrics.orders,
      icon: ShoppingCartIcon,
      trend: trends.salesTrend,
      color: 'green'
    },
    {
      name: 'Unsold',
      value: metrics.unsold,
      icon: ExclamationTriangleIcon,
      trend: 'stable',
      color: 'orange'
    },
    {
      name: '90-day total',
      value: `$${metrics.ninetyDayTotal.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      trend: trends.salesTrend,
      color: 'purple'
    }
  ];
  
  // Additional performance metrics
  const performanceStats = [
    {
      name: 'Total Views',
      value: metrics.totalViews.toLocaleString(),
      icon: EyeIcon,
      subtext: `${metrics.averageViewsPerListing.toFixed(0)} avg per listing`
    },
    {
      name: 'Watchers',
      value: metrics.totalWatchers.toLocaleString(),
      icon: ClockIcon,
      subtext: `${metrics.watchToViewRatio.toFixed(1)}% watch rate`
    },
    {
      name: 'Conversion Rate',
      value: `${metrics.conversionRate.toFixed(2)}%`,
      icon: ArrowTrendingUpIcon,
      subtext: 'Sales per view'
    },
    {
      name: 'Inventory Value',
      value: `$${metrics.totalInventoryValue.toFixed(0)}`,
      icon: TagIcon,
      subtext: `$${metrics.averagePrice.toFixed(0)} average`
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-400"></div>
          <div className="absolute inset-0 rounded-full animate-pulse bg-primary-200/30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      <div className="mb-6 sm:mb-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end">
          <div className="mb-4 sm:mb-0">
            <h1 className="mobile-title font-bold gradient-text">Dashboard</h1>
            <p className="mobile-subtitle text-primary-500 mt-2">Welcome back! Here's what's happening with your listings.</p>
          </div>
          
          {/* Desktop action buttons */}
          <div className="hidden sm:flex gap-2 lg:gap-3">
            <button
              onClick={() => {
                setLoading(true);
                fetchDashboardData();
              }}
              disabled={syncing}
              className="inline-flex items-center mobile-button border border-primary-300 rounded-xl shadow-sm text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
              <span className="hidden lg:inline">Refresh</span>
              <span className="lg:hidden">Refresh</span>
            </button>
            <button
              onClick={syncEbayData}
              disabled={syncing}
              className="inline-flex items-center mobile-button border border-blue-300 rounded-xl shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <div className="-ml-1 mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
              ) : (
                <CloudArrowDownIcon className="-ml-1 mr-2 h-4 w-4" />
              )}
              <span className="hidden lg:inline">{syncing ? 'Syncing...' : 'Sync eBay'}</span>
              <span className="lg:hidden">{syncing ? 'Sync...' : 'Sync'}</span>
            </button>
            <Link
              to="/products"
              className="glow-button inline-flex items-center mobile-button border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white hover-lift"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              <span className="hidden lg:inline">New Product</span>
              <span className="lg:hidden">New</span>
            </Link>
          </div>
        </div>
        
        {/* Mobile action buttons */}
        <div className="sm:hidden grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => {
              setLoading(true);
              fetchDashboardData();
            }}
            disabled={syncing}
            className="inline-flex items-center justify-center mobile-button border border-primary-300 rounded-xl shadow-sm text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <button
            onClick={syncEbayData}
            disabled={syncing}
            className="inline-flex items-center justify-center mobile-button border border-blue-300 rounded-xl shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
            ) : (
              <CloudArrowDownIcon className="h-4 w-4 mr-1" />
            )}
            {syncing ? 'Sync...' : 'Sync'}
          </button>
          <Link
            to="/products"
            className="glow-button inline-flex items-center justify-center mobile-button border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New
          </Link>
        </div>
      </div>


      {/* Cost Saved Banner */}
      {metrics.costSaved && metrics.costSaved > 0 && (
        <div className="mb-8 bg-gradient-to-r from-green-50 via-primary-50 to-primary-100 border border-primary-200 rounded-2xl p-6 shadow-soft-shadow hover-lift">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-primary-400 flex items-center justify-center shadow-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-primary-700">
                Smart Relisting Savings 🎉
              </h3>
              <div className="mt-2 text-sm text-primary-600">
                <p>
                  You've saved <span className="font-bold text-xl text-green-600">${metrics.costSaved.toFixed(2)}</span> by
                  using smart relisting on Etsy! That's {Math.floor(metrics.costSaved / 0.20)} listings
                  renewed without additional fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main eBay KPI Stats */}
      <div className="mobile-stats-grid gap-4 sm:gap-6 mb-6 sm:mb-8">
        {mainStats.map((stat, index) => {
          const colorClasses = {
            blue: 'from-blue-300 to-blue-400',
            green: 'from-green-300 to-green-400', 
            orange: 'from-orange-300 to-orange-400',
            purple: 'from-purple-300 to-purple-400'
          };
          
          return (
            <div
              key={stat.name}
              className="relative bg-white/80 backdrop-blur-sm mobile-card shadow-soft-shadow overflow-hidden hover-lift border border-primary-100 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-primary-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <dt className="relative z-10">
                <div className={`absolute -top-2 -left-2 bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-xl p-2 sm:p-3 shadow-lg group-hover:shadow-glow transition-all duration-300 transform group-hover:scale-110`}>
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-12 sm:ml-16 text-xs sm:text-sm font-medium text-primary-600 truncate group-hover:text-primary-700 transition-colors duration-200">
                  {stat.name}
                </p>
              </dt>
              <dd className="ml-12 sm:ml-16 pb-2 flex items-baseline relative z-10">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-700 group-hover:text-primary-800 transition-colors duration-200">
                  {stat.value}
                </p>
                {stat.trend !== 'stable' && (
                  <div className={`ml-2 sm:ml-3 flex items-center text-xs sm:text-sm font-semibold ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-500'
                  } group-hover:scale-110 transition-transform duration-200`}>
                    {stat.trend === 'up' ? (
                      <ArrowUpIcon className="self-center flex-shrink-0 h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    ) : (
                      <ArrowDownIcon className="self-center flex-shrink-0 h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    )}
                  </div>
                )}
              </dd>
            </div>
          );
        })}
      </div>
      
      {/* Performance Metrics */}
      <div className="mobile-stats-grid gap-4 sm:gap-6 mb-6 sm:mb-8">
        {performanceStats.map((stat, index) => (
          <div
            key={stat.name}
            className="bg-white/80 backdrop-blur-sm mobile-card shadow-soft-shadow border border-primary-100 hover-lift"
            style={{ animationDelay: `${(index + 4) * 100}ms` }}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-700" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-primary-600 truncate">{stat.name}</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-700">{stat.value}</p>
                <p className="text-xs text-primary-500 truncate">{stat.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Insights Cards */}
      {metrics.insights.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {metrics.insights.map((insight, index) => {
            const InsightIcon = insight.type === 'positive' ? CheckCircleIcon : 
                              insight.type === 'warning' ? ExclamationTriangleIcon : InformationCircleIcon;
            const colorClasses = {
              positive: 'border-green-200 bg-green-50/80 text-green-700',
              warning: 'border-orange-200 bg-orange-50/80 text-orange-700',
              info: 'border-blue-200 bg-blue-50/80 text-blue-700'
            };
            
            return (
              <div
                key={index}
                className={`p-4 rounded-xl border ${colorClasses[insight.type]} backdrop-blur-sm hover-lift`}
              >
                <div className="flex items-start">
                  <InsightIcon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm font-medium">{insight.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Top Categories */}
      {metrics.topCategories.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm shadow-soft-shadow rounded-2xl border border-primary-100 overflow-hidden mb-8">
          <div className="px-6 py-6 sm:p-8">
            <h3 className="text-2xl font-semibold text-primary-700 mb-6">Top Categories</h3>
            <div className="space-y-4">
              {metrics.topCategories.slice(0, 5).map((category, index) => (
                <div key={category.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-primary-50/50 transition-all duration-200">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mr-4">
                      <span className="text-primary-700 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-primary-700">{category.name}</p>
                      <p className="text-sm text-primary-500">{category.listings} listings • {category.views} views</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-700">${category.revenue.toFixed(0)}</p>
                    <p className="text-sm text-primary-500">{category.sales} sales</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white/80 backdrop-blur-sm shadow-soft-shadow rounded-2xl border border-primary-100 overflow-hidden">
        <div className="px-6 py-6 sm:p-8">
          <h3 className="text-2xl font-semibold text-primary-700 mb-6 flex items-center">
            <span className="h-2 w-2 bg-primary-400 rounded-full mr-3 animate-pulse"></span>
            Recent Activity
          </h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {metrics.recentActivity.length === 0 ? (
                <li className="text-center py-8">
                  <div className="text-primary-400 text-lg">
                    <ShoppingBagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-primary-500">No recent activity yet</p>
                    <p className="text-sm text-primary-400 mt-2">Start by creating your first product!</p>
                  </div>
                </li>
              ) : (
                metrics.recentActivity.map((activity, activityIdx) => (
                  <li key={activity.id} className="hover-lift">
                    <div className="relative pb-8">
                      {activityIdx !== metrics.recentActivity.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gradient-to-b from-primary-200 to-primary-300"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-4 p-3 rounded-xl hover:bg-primary-50/50 transition-all duration-200">
                        <div>
                          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-300 to-primary-400 flex items-center justify-center ring-4 ring-white shadow-lg">
                            <ShoppingBagIcon className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-primary-600">
                              {activity.message}{' '}
                              <span className="font-semibold text-primary-700 bg-primary-100 px-2 py-1 rounded-lg">
                                {activity.marketplace}
                              </span>
                            </p>
                            {/* Show listing date and days listed for active listings */}
                            {activity.startDate && activity.daysListed !== undefined && activity.type === 'LISTING_CREATED' && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                <span className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                  <ClockIcon className="h-3 w-3 mr-1" />
                                  Listed: {new Date(activity.startDate).toLocaleDateString()}
                                </span>
                                <span className="inline-flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                  📅 {activity.daysListed} {activity.daysListed === 1 ? 'day' : 'days'} listed
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-xs whitespace-nowrap text-primary-500 bg-primary-50 px-2 py-1 rounded-lg">
                            {new Date(activity.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
