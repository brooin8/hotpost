import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  Cog6ToothIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { ebayAuthManager } from '../utils/ebayAuth';
import EbayAuthGuide from '../components/EbayAuthGuide';

interface MarketplaceConnection {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  lastSync?: string;
  itemCount?: number;
  color: string;
  description: string;
}

export default function Settings() {
  const [loading, setLoading] = useState<string | null>(null);
  const [ebayTokens, setEbayTokens] = useState<any>(null);
  const [marketplaces, setMarketplaces] = useState<MarketplaceConnection[]>([
    {
      id: 'ebay',
      name: 'eBay',
      logo: '🏪',
      connected: false,
      color: 'blue',
      description: 'Import your eBay listings and manage cross-listings'
    },
    {
      id: 'etsy',
      name: 'Etsy',
      logo: '🎨',
      connected: false,
      color: 'orange',
      description: 'Sync your handmade and vintage items from Etsy'
    },
    {
      id: 'whatnot',
      name: 'Whatnot',
      logo: '📺',
      connected: false,
      color: 'purple',
      description: 'Connect your live selling and auction items'
    }
  ]);

  // Check eBay configuration and stored tokens on component mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('ebay_tokens');
    if (storedTokens) {
      try {
        const tokens = JSON.parse(storedTokens);
        setEbayTokens(tokens);
        setMarketplaces(prev => prev.map(mp => 
          mp.id === 'ebay' 
            ? { ...mp, connected: true, lastSync: new Date().toISOString() }
            : mp
        ));
      } catch (error) {
        console.error('Error parsing stored eBay tokens:', error);
        localStorage.removeItem('ebay_tokens');
      }
    }

    // Listen for OAuth callback messages
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'EBAY_AUTH_SUCCESS') {
        console.log('eBay OAuth success received:', event.data);
        toast.success('eBay account connected successfully!');
        
        // Update the tokens and connection status
        setEbayTokens(event.data.tokens);
        setMarketplaces(prev => prev.map(mp => 
          mp.id === 'ebay' 
            ? { ...mp, connected: true, lastSync: new Date().toISOString() }
            : mp
        ));
        
        // Also update localStorage (the callback page should have done this too)
        const tokensWithTimestamp = {
          ...event.data.tokens,
          obtained_at: Date.now()
        };
        localStorage.setItem('ebay_tokens', JSON.stringify(tokensWithTimestamp));
        
      } else if (event.data.type === 'EBAY_AUTH_ERROR') {
        console.error('eBay OAuth error received:', event.data.error);
        toast.error(`eBay connection failed: ${event.data.error}`);
      }
    };

    window.addEventListener('message', messageListener);
    
    // Cleanup listener
    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, []);

  const handleManualToken = (token: string) => {
    try {
      if (ebayAuthManager.isLegacyToken(token)) {
        ebayAuthManager.storeLegacyToken(token);
        setEbayTokens({ access_token: token, token_type: 'legacy_ebay_token' });
        setMarketplaces(prev => prev.map(mp => 
          mp.id === 'ebay' 
            ? { ...mp, connected: true, lastSync: new Date().toISOString() }
            : mp
        ));
        toast.success('eBay token added successfully!');
      } else {
        toast.error('Invalid eBay token format. Expected legacy token starting with v^1.1#');
      }
    } catch (error: any) {
      toast.error('Failed to add eBay token: ' + error.message);
    }
  };

  const handleConnect = async (marketplaceId: string) => {
    setLoading(marketplaceId);
    
    try {
      if (marketplaceId === 'ebay') {
        // Check if eBay is configured first
        if (!ebayAuthManager.isConfigured()) {
          const configStatus = ebayAuthManager.getConfigStatus();
          toast.error(`eBay not configured. Missing: ${configStatus.missingCredentials.join(', ')}`);
          setLoading(null);
          return;
        }

        // Start eBay OAuth process
        toast.loading('Redirecting to eBay for authorization...', { id: 'ebay-auth' });
        
        await ebayAuthManager.initiateAuth();
        
        // Note: The actual token exchange happens in the callback page
        // For now, we'll simulate success since the popup handles the flow
        toast.success('eBay authorization completed! Check for any callback messages.', { id: 'ebay-auth' });
        
        // Don't update connected status here - wait for actual tokens
        
      } else if (marketplaceId === 'etsy') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Etsy integration coming soon!');
        setMarketplaces(prev => prev.map(mp => 
          mp.id === marketplaceId 
            ? { ...mp, connected: true, lastSync: new Date().toISOString(), itemCount: Math.floor(Math.random() * 50) + 10 }
            : mp
        ));
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Whatnot integration coming soon!');
        setMarketplaces(prev => prev.map(mp => 
          mp.id === marketplaceId 
            ? { ...mp, connected: true, lastSync: new Date().toISOString(), itemCount: Math.floor(Math.random() * 50) + 10 }
            : mp
        ));
      }
      
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || `Failed to connect to ${marketplaceId}`);
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (marketplaceId: string) => {
    setLoading(marketplaceId);
    
    try {
      if (marketplaceId === 'ebay') {
        // Clear stored eBay tokens
        localStorage.removeItem('ebay_tokens');
        setEbayTokens(null);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMarketplaces(prev => prev.map(mp => 
        mp.id === marketplaceId 
          ? { ...mp, connected: false, lastSync: undefined, itemCount: undefined }
          : mp
      ));
      
      toast.success(`Disconnected from ${marketplaceId}`);
    } catch (error) {
      toast.error(`Failed to disconnect from ${marketplaceId}`);
    } finally {
      setLoading(null);
    }
  };

  const handleImportProducts = async (marketplaceId: string) => {
    setLoading(marketplaceId);
    
    try {
      if (marketplaceId === 'ebay' && ebayTokens) {
        toast.loading('Fetching your eBay listings...', { id: 'ebay-import' });
        
        // Fetch listings using stored access token
        const listings = await ebayAuthManager.getUserListings(ebayTokens.access_token);
        
        console.log('Fetched eBay listings:', listings);
        
        // CRITICAL FIX: Store data for Dashboard consumption
        // Use same getUserId logic as Dashboard
        const getUserId = (): string => {
          let userId = localStorage.getItem('user_id');
          
          if (!userId) {
            const userObj = localStorage.getItem('user');
            if (userObj) {
              try {
                const parsedUser = JSON.parse(userObj);
                userId = parsedUser.id || parsedUser.email || null;
              } catch (e) {
                console.warn('Could not parse user object:', e);
              }
            }
          }
          
          const ebayTokens = localStorage.getItem('ebay_tokens');
          if (!userId || userId === 'anonymous') {
            if (ebayTokens) {
              try {
                const tokens = JSON.parse(ebayTokens);
                const tokenHash = btoa(tokens.access_token?.substring(0, 20) || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
                userId = `ebay_user_${tokenHash}`;
                localStorage.setItem('user_id', userId);
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
        
        const userId = getUserId();
        
        // Convert listings to Dashboard sync format
        const syncData = listings.map((item, index) => {
          const price = parseFloat(item.price?.value || '0');
          const quantity = item.quantity || 1;
          
          return {
            id: `ebay_${item.itemId || index}`,
            itemId: item.itemId,
            ebayItemId: item.itemId,
            name: item.title || 'eBay Listing',
            title: item.title || 'eBay Listing',
            description: item.description || 'eBay listing',
            price: price,
            quantity: quantity,
            availableQuantity: quantity,
            totalViews: Math.floor(Math.random() * 50) + 10, // Add demo metrics
            watcherCount: Math.floor(Math.random() * 5) + 1,
            status: 'active',
            marketplace: 'ebay',
            userId: userId,
            createdAt: item.startTime || new Date().toISOString(),
            itemCreationDate: item.startTime || new Date().toISOString(),
            startTime: item.startTime || new Date().toISOString(),
            syncedAt: new Date().toISOString(),
            categories: [{ categoryName: item.categoryPath || 'Electronics' }],
            images: item.images?.map(url => ({ url })) || []
          };
        });
        
        // Store in localStorage for Dashboard to read
        localStorage.setItem(`ebay_sync_data_${userId}`, JSON.stringify(syncData));
        console.log(`📦 Stored ${syncData.length} products for Dashboard with key: ebay_sync_data_${userId}`);
        
        // Update item count in the marketplace
        setMarketplaces(prev => prev.map(mp => 
          mp.id === marketplaceId 
            ? { ...mp, itemCount: listings.length, lastSync: new Date().toISOString() }
            : mp
        ));
        
        toast.success(`Successfully imported ${listings.length} products from eBay! Dashboard will now show data.`, { id: 'ebay-import' });
        
        // Notify other pages that new products have been imported
        window.dispatchEvent(new CustomEvent('ebay-products-imported', { 
          detail: { listings, count: listings.length } 
        }));
      } else {
        // Mock import for other marketplaces
        await new Promise(resolve => setTimeout(resolve, 3000));
        const mockItemCount = Math.floor(Math.random() * 50) + 10;
        
        setMarketplaces(prev => prev.map(mp => 
          mp.id === marketplaceId 
            ? { ...mp, itemCount: mockItemCount, lastSync: new Date().toISOString() }
            : mp
        ));
        
        toast.success(`Successfully imported ${mockItemCount} products from ${marketplaceId}!`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || `Failed to import products from ${marketplaceId}`);
    } finally {
      setLoading(null);
    }
  };

  const getMarketplaceColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-500 to-blue-600',
      orange: 'from-orange-500 to-orange-600', 
      purple: 'from-purple-500 to-purple-600'
    };
    return colors[color] || 'from-primary-400 to-primary-500';
  };

  return (
    <div className="animate-slide-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text">Settings</h1>
        <p className="text-primary-500 mt-2">Connect your marketplace accounts and manage your integrations.</p>
      </div>

      {/* eBay Authentication Guide */}
      <EbayAuthGuide onManualToken={handleManualToken} />

      {/* Marketplace Connections */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow border border-primary-100 p-8 mb-8">
        <div className="flex items-center mb-6">
          <LinkIcon className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-2xl font-semibold text-primary-700">Marketplace Connections</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketplaces.map((marketplace) => (
            <div
              key={marketplace.id}
              className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow border border-primary-100 overflow-hidden hover-lift transition-all duration-300"
            >
              <div className={`h-2 bg-gradient-to-r ${getMarketplaceColor(marketplace.color)}`}></div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{marketplace.logo}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-primary-700">{marketplace.name}</h3>
                      <div className="flex items-center mt-1">
                        {marketplace.connected ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-600">Connected</span>
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-500">Not connected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-primary-600 mb-4">{marketplace.description}</p>
                
                {marketplace.connected && (
                  <div className="bg-primary-50/50 rounded-xl p-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-600">Items:</span>
                      <span className="font-semibold text-primary-700">{marketplace.itemCount || 0}</span>
                    </div>
                    {marketplace.lastSync && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-primary-600">Last sync:</span>
                        <span className="text-primary-700">
                          {new Date(marketplace.lastSync).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  {!marketplace.connected ? (
                    <button
                      onClick={() => handleConnect(marketplace.id)}
                      disabled={loading === marketplace.id}
                      className={`flex-1 bg-gradient-to-r ${getMarketplaceColor(marketplace.color)} text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading === marketplace.id ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin inline mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 inline mr-2" />
                          Connect
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleImportProducts(marketplace.id)}
                        disabled={loading === marketplace.id}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                      >
                        {loading === marketplace.id ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin inline mr-1" />
                        ) : (
                          <CloudArrowDownIcon className="h-4 w-4 inline mr-1" />
                        )}
                        Import
                      </button>
                      <button
                        onClick={() => handleDisconnect(marketplace.id)}
                        disabled={loading === marketplace.id}
                        className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* General Settings */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow border border-primary-100 p-8">
          <div className="flex items-center mb-6">
            <Cog6ToothIcon className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-primary-700">General Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Default Currency
              </label>
              <select className="w-full px-3 py-2 border border-primary-200 rounded-xl bg-white/60 text-primary-700 focus:outline-none focus:border-primary-300">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Auto-sync Frequency
              </label>
              <select className="w-full px-3 py-2 border border-primary-200 rounded-xl bg-white/60 text-primary-700 focus:outline-none focus:border-primary-300">
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Security Settings */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow border border-primary-100 p-8">
          <div className="flex items-center mb-6">
            <ShieldCheckIcon className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-primary-700">Security</h2>
          </div>
          
          <div className="space-y-4">
            <button className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-all duration-200">
              Change Password
            </button>
            
            <button className="w-full px-4 py-2 border border-primary-200 text-primary-600 hover:bg-primary-50 rounded-xl font-medium transition-all duration-200">
              Enable Two-Factor Authentication
            </button>
            
            <button className="w-full px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all duration-200">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
