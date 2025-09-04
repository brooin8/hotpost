import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import ProductModal from '../components/ProductModal';
import CrossListModal from '../components/CrossListModal';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  sku?: string;
  images: { url: string; isPrimary?: boolean; order?: number }[];
  allImages?: { url: string; isPrimary?: boolean; order?: number }[];
  primaryImageUrl?: string;
  imageCount?: number;
  status: string;
  listings: {
    marketplace: string;
    status: string;
  }[];
  createdAt: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCrossListModalOpen, setIsCrossListModalOpen] = useState(false);
  const [selectedProductForCrossList, setSelectedProductForCrossList] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    
    // Listen for eBay import events from Settings page
    const handleEbayImport = () => {
      console.log('eBay products imported, refreshing Products page...');
      fetchProducts();
    };
    
    window.addEventListener('ebay-products-imported', handleEbayImport);
    
    return () => {
      window.removeEventListener('ebay-products-imported', handleEbayImport);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      // Always fetch fresh eBay data instead of using potentially stale cache
      const ebayTokens = localStorage.getItem('ebay_tokens');
      const userId = localStorage.getItem('user_id') || 'anonymous';
      
      if (ebayTokens) {
        console.log('eBay tokens found, fetching FRESH data from eBay API...');
        
        // Clear any stale cached sync data first
        console.log('🧹 Clearing potentially stale cached eBay sync data...');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('ebay_sync_data_')) {
            console.log(`Removing stale cache key: ${key}`);
            localStorage.removeItem(key);
          }
        });
        
        // Always try direct eBay API call for fresh data
        try {
          const tokens = JSON.parse(ebayTokens);
          console.log('🚀 Making direct eBay API call for fresh listings...');
          
          const response = await fetch('/api/ebay/listings?limit=100&fresh=true', {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const ebayData = await response.json();
            console.log('✅ Fresh eBay listings response:', ebayData);
            
            if (ebayData.itemSummaries && ebayData.itemSummaries.length > 0) {
              console.log('📄 Processing', ebayData.itemSummaries.length, 'eBay items with full descriptions...');
              
              // Transform fresh eBay listings using full descriptions now available from API
              const ebayProducts: Product[] = ebayData.itemSummaries.map((item: any, index: number) => {
                // Use the full description that's now extracted by the backend API
                let fullDescription = item.fullDescription || item.description || item.shortDescription || 'No description available';
                
                console.log(`📄 Item ${item.itemId} description:`, {
                  hasFullDescription: !!item.fullDescription,
                  hasDescription: !!item.description,
                  hasShortDescription: !!item.shortDescription,
                  hasSubtitle: !!item.subtitle,
                  finalDescriptionLength: fullDescription.length
                });
                
                // Enhanced image handling - use ALL images from eBay API
                let images: any[] = [];
                let allImages: any[] = [];
                
                // Handle new enhanced image structure from API
                if (item.allImages && Array.isArray(item.allImages)) {
                  allImages = item.allImages.map((img: any) => ({
                    url: img.url || img,
                    isPrimary: img.isPrimary || false,
                    order: img.order || 1
                  }));
                  images = allImages; // Use all images
                } else if (item.images && Array.isArray(item.images)) {
                  // Handle both old and new image formats
                  images = item.images.map((img: any, index: number) => ({
                    url: img.url || img,
                    isPrimary: index === 0 || img.isPrimary,
                    order: img.order || index + 1
                  }));
                  allImages = images;
                } else if (item.image?.imageUrl) {
                  // Fallback to single image
                  images = [{ 
                    url: item.image.imageUrl,
                    isPrimary: true,
                    order: 1
                  }];
                  allImages = images;
                }
                
                console.log(`📸 Item ${item.itemId} has ${images.length} images:`, images.slice(0, 3));
                
                return {
                  id: item.itemId || `ebay_${index}`,
                  title: item.title || 'Untitled eBay Listing',
                  description: fullDescription,
                  price: parseFloat(item.price?.value || '0'),
                  quantity: item.availableQuantity || 0,
                  sku: item.mpn || '',
                  images,
                  status: 'ACTIVE',
                  listings: [{ marketplace: 'EBAY', status: 'ACTIVE' }],
                  createdAt: item.itemCreationDate || new Date().toISOString()
                };
              });
              
              setProducts(ebayProducts);
              console.log(`✅ Loaded ${ebayProducts.length} FRESH eBay products from direct API`);
              return;
            }
          } else {
            console.warn('❌ Fresh eBay API call failed:', response.status, response.statusText);
          }
        } catch (apiError) {
          console.error('❌ Direct eBay API call failed:', apiError);
        }
        
        // Fallback: Try to get stored sync data only if direct API fails
        console.log('⚠️ Direct API failed, falling back to cached sync data...');
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
              console.log(`Using fallback sync data from key: ${key}`);
              break;
            }
          }
        }
        
        if (storedSyncData) {
          try {
            const syncedProducts = JSON.parse(storedSyncData);
            console.log(`Found ${syncedProducts.length} synced eBay products`);
            
            // Debug: Log the first item to understand data structure
            if (syncedProducts.length > 0) {
              console.log('🔍 First eBay product raw data:', syncedProducts[0]);
              console.log('🔍 Available properties:', Object.keys(syncedProducts[0]));
              
              // Check if this is demo/fake data
              const firstItem = syncedProducts[0];
              const isDemoData = firstItem.name && firstItem.name.includes('Electronics Component') 
                                || firstItem.id && firstItem.id.includes('ebay_active_')
                                || (firstItem.ebayItemId === '186703807963' && syncedProducts.length > 1);
              
              if (isDemoData) {
                console.warn('⚠️ DETECTED DEMO DATA - This is not real eBay inventory!');
                console.warn('🧹 Clearing demo data and attempting fresh eBay sync...');
                
                // Clear all demo sync data
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('ebay_sync_data_')) {
                    console.log(`Removing demo data key: ${key}`);
                    localStorage.removeItem(key);
                  }
                });
                
                // Try direct eBay API call instead
                throw new Error('Demo data detected, switching to direct API call');
              }
            }
            
            // Filter out inactive/ended listings first - simplified for mobile Safari compatibility
            const activeListings = syncedProducts.filter((item: any) => {
              // Check various status fields that might indicate inactive listings (handle both upper and lowercase)
              const status = (item.status || item.listingStatus || (item.sellingState && item.sellingState.sellingState) || '').toLowerCase();
              const isActive = status !== 'inactive' && status !== 'ended' && status !== 'completed' && status !== 'sold';
              
              // Also check if quantity is available (active listings should have quantity > 0)
              const hasQuantity = (item.availableQuantity || item.quantity || item.quantityAvailable || 0) > 0;
              
              // Return all active items with quantity (no artificial limit)
              return isActive && hasQuantity;
            });
            
            console.log(`Filtered to ${activeListings.length} active listings from ${syncedProducts.length} total items`);
            
            // Transform synced eBay data to Product format
            const ebayProducts: Product[] = activeListings.map((item: any, index: number) => {
              // Handle multiple possible title fields from eBay API - prioritize 'name' field from your sync data
              const title = item.name || item.title || item.itemTitle || item.shortDescription || item.localizedAspects?.find((a: any) => a.name === 'Title')?.value || `eBay Listing #${item.itemId || index}`;
              
              // Handle multiple possible description fields
              const description = item.description || item.shortDescription || item.longDescription || item.subtitle || 'No description available';
              
              // Handle multiple possible price fields
              let price = 0;
              if (item.price?.value) {
                price = parseFloat(item.price.value);
              } else if (item.price) {
                price = parseFloat(item.price);
              } else if (item.currentPrice?.value) {
                price = parseFloat(item.currentPrice.value);
              } else if (item.buyItNowPrice?.value) {
                price = parseFloat(item.buyItNowPrice.value);
              }
              
              // Handle multiple possible quantity fields
              const quantity = item.availableQuantity || item.quantity || item.quantityAvailable || 1;
              
              // Handle multiple possible image fields
              let images: any[] = [];
              if (item.images && Array.isArray(item.images)) {
                images = item.images.map((img: any) => ({
                  url: typeof img === 'string' ? img : (img.imageUrl || img.url || img)
                }));
              } else if (item.image?.imageUrl) {
                images = [{ url: item.image.imageUrl }];
              } else if (item.imageUrls && Array.isArray(item.imageUrls)) {
                images = item.imageUrls.map((url: string) => ({ url }));
              } else if (item.pictureURLs && Array.isArray(item.pictureURLs)) {
                images = item.pictureURLs.map((url: string) => ({ url }));
              }
              
              // Handle SKU/MPN fields
              const sku = item.sku || item.mpn || item.manufacturerPartNumber || item.customLabel || '';
              
              console.log(`Mapping eBay item #${index}:`, {
                originalItem: item,
                mappedTitle: title,
                mappedPrice: price,
                mappedQuantity: quantity,
                mappedImages: images
              });
              
              return {
                id: item.itemId || item.id || `ebay_${index}`,
                title,
                description,
                price,
                quantity,
                sku,
                images,
                status: item.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
                listings: [{ marketplace: 'EBAY', status: item.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' }],
                createdAt: item.itemCreationDate || item.createdAt || item.startTime || new Date().toISOString()
              };
            });
            
            setProducts(ebayProducts);
            console.log(`Loaded ${ebayProducts.length} eBay products from stored sync data`);
            return;
          } catch (parseError) {
            console.error('Error parsing stored sync data:', parseError);
          }
        }
        
        // If no stored data, try direct API call as fallback
        try {
          const tokens = JSON.parse(ebayTokens);
          console.log('No stored sync data, attempting direct eBay API call...');
          
          const response = await fetch('/api/ebay/listings?limit=100', {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const ebayData = await response.json();
            console.log('eBay listings response:', ebayData);
            
            if (ebayData.itemSummaries && ebayData.itemSummaries.length > 0) {
              // Transform eBay listings to Product format
              const ebayProducts: Product[] = ebayData.itemSummaries.map((item: any, index: number) => ({
                id: item.itemId || `ebay_${index}`,
                title: item.title || 'Untitled eBay Listing',
                description: item.shortDescription || 'No description available',
                price: parseFloat(item.price?.value || '0'),
                quantity: item.availableQuantity || 0,
                sku: item.mpn || '',
                images: item.image?.imageUrl ? [{ url: item.image.imageUrl }] : [],
                status: 'ACTIVE',
                listings: [{ marketplace: 'EBAY', status: 'ACTIVE' }],
                createdAt: item.itemCreationDate || new Date().toISOString()
              }));
              
              setProducts(ebayProducts);
              console.log(`Loaded ${ebayProducts.length} eBay products from direct API`);
              return;
            }
          } else {
            console.warn('eBay API call failed:', response.status, response.statusText);
          }
        } catch (apiError) {
          console.error('Direct eBay API call failed:', apiError);
        }
      }
      
        // If no eBay data available, try to get data from the global sync store
        console.log('No direct eBay data available, checking global sync store...');
        
        // Check if there's synced data in global store (same as Dashboard uses)
        // Safely access global object with proper type checking
        const globalAny = global as any;
        if (globalAny.userProducts && globalAny.userProducts[userId]) {
          const globalSyncedProducts = globalAny.userProducts[userId];
          console.log(`Found ${globalSyncedProducts.length} products in global store`);
          
          // Transform global store data to Product format
          const productsFromGlobal: Product[] = globalSyncedProducts.map((item: any, index: number) => ({
            id: item.ebayItemId || item.id || `global_${index}`,
            title: item.name || item.title || 'Untitled Product',
            description: item.description || 'No description',
            price: parseFloat(item.price || '0'),
            quantity: item.quantity || 1,
            sku: item.sku || '',
            images: item.images || [],
            status: item.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            listings: [{ marketplace: 'EBAY', status: item.status === 'active' ? 'ACTIVE' : 'INACTIVE' }],
            createdAt: item.createdAt || new Date().toISOString()
          }));
          
          setProducts(productsFromGlobal);
          console.log(`Loaded ${productsFromGlobal.length} products from global store`);
          return;
        }
        
        // Final fallback: show empty state
        console.log('No data available - showing empty state');
        setProducts([]);
      
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleCrossList = (product: Product) => {
    setSelectedProductForCrossList(product);
    setIsCrossListModalOpen(true);
  };

  const handleSyncProducts = async () => {
    const ebayTokens = localStorage.getItem('ebay_tokens');
    if (!ebayTokens) {
      toast.error('No eBay connection found. Please connect eBay in Settings first.');
      return;
    }
    
    setSyncing(true);
    toast.loading('Syncing eBay listings...', { id: 'sync-ebay' });
    
    try {
      await fetchProducts();
      toast.success('eBay listings synced successfully!', { id: 'sync-ebay' });
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync eBay listings', { id: 'sync-ebay' });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/csv/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Products exported successfully');
    } catch (error) {
      toast.error('Failed to export products');
    }
  };

  const getMarketplaceColor = (marketplace: string) => {
    const colors: Record<string, string> = {
      EBAY: 'bg-blue-100/70 text-blue-700 border border-blue-200',
      ETSY: 'bg-orange-100/70 text-orange-700 border border-orange-200',
      WHATNOT: 'bg-purple-100/70 text-purple-700 border border-purple-200',
    };
    return colors[marketplace] || 'bg-primary-100/70 text-primary-700 border border-primary-200';
  };

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
        <div className="sm:flex sm:items-end sm:justify-between">
          <div className="sm:flex-auto">
            <h1 className="mobile-title font-bold gradient-text">Products</h1>
            <p className="mt-2 mobile-subtitle text-primary-500">
              Manage your products and cross-list them to multiple marketplaces
            </p>
          </div>
          {/* Desktop action buttons */}
          <div className="hidden sm:block mt-6 sm:mt-0 sm:ml-16 sm:flex-none">
            <div className="flex space-x-3">
              <button
                onClick={handleSyncProducts}
                disabled={syncing}
                className="inline-flex items-center mobile-button border border-blue-200 shadow-soft-shadow text-sm font-medium rounded-xl text-blue-600 bg-blue-50/80 backdrop-blur-sm hover:bg-blue-100/50 hover:shadow-glow-sm transition-all duration-200 hover-lift disabled:opacity-50"
              >
                <ArrowPathIcon className={`-ml-0.5 mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">{syncing ? 'Syncing...' : 'Sync eBay'}</span>
                <span className="lg:hidden">{syncing ? 'Sync...' : 'Sync'}</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center mobile-button border border-primary-200 shadow-soft-shadow text-sm font-medium rounded-xl text-primary-600 bg-white/80 backdrop-blur-sm hover:bg-primary-50/50 hover:shadow-glow-sm transition-all duration-200 hover-lift"
              >
                <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" />
                <span className="hidden lg:inline">Export CSV</span>
                <span className="lg:hidden">Export</span>
              </button>
              <Link
                to="/import"
                className="inline-flex items-center mobile-button border border-primary-200 shadow-soft-shadow text-sm font-medium rounded-xl text-primary-600 bg-white/80 backdrop-blur-sm hover:bg-primary-50/50 hover:shadow-glow-sm transition-all duration-200 hover-lift"
              >
                <CloudArrowUpIcon className="-ml-0.5 mr-2 h-4 w-4" />
                <span className="hidden lg:inline">Import CSV</span>
                <span className="lg:hidden">Import</span>
              </Link>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="glow-button inline-flex items-center mobile-button border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white hover-lift"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                <span className="hidden lg:inline">New Product</span>
                <span className="lg:hidden">New</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile action buttons - stacked */}
        <div className="sm:hidden mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSyncProducts}
              disabled={syncing}
              className="inline-flex items-center justify-center mobile-button border border-blue-200 shadow-soft-shadow text-sm font-medium rounded-xl text-blue-600 bg-blue-50/80 backdrop-blur-sm hover:bg-blue-100/50 hover:shadow-glow-sm transition-all duration-200 disabled:opacity-50"
            >
              <ArrowPathIcon className={`mr-1 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync eBay'}
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setIsProductModalOpen(true);
              }}
              className="glow-button inline-flex items-center justify-center mobile-button border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white"
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              New Product
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center mobile-button border border-primary-200 shadow-soft-shadow text-sm font-medium rounded-xl text-primary-600 bg-white/80 backdrop-blur-sm hover:bg-primary-50/50 hover:shadow-glow-sm transition-all duration-200"
            >
              <ArrowDownTrayIcon className="mr-1 h-4 w-4" />
              Export CSV
            </button>
            <Link
              to="/import"
              className="inline-flex items-center justify-center mobile-button border border-primary-200 shadow-soft-shadow text-sm font-medium rounded-xl text-primary-600 bg-white/80 backdrop-blur-sm hover:bg-primary-50/50 hover:shadow-glow-sm transition-all duration-200"
            >
              <CloudArrowUpIcon className="mr-1 h-4 w-4" />
              Import CSV
            </Link>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="mt-6 flex justify-end">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow border border-primary-100 flex overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-3 transition-all duration-200 ${
              viewMode === 'grid' 
                ? 'bg-gradient-to-r from-primary-300 to-primary-400 text-white shadow-coral-glow' 
                : 'text-primary-600 hover:bg-primary-50/50 hover:text-primary-700'
            }`}
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-3 transition-all duration-200 ${
              viewMode === 'list' 
                ? 'bg-gradient-to-r from-primary-300 to-primary-400 text-white shadow-coral-glow' 
                : 'text-primary-600 hover:bg-primary-50/50 hover:text-primary-700'
            }`}
          >
            <ListBulletIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="mt-8 text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow border border-primary-100">
          <ShoppingBagIcon className="h-16 w-16 text-primary-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-primary-700 mb-2">No Products Found</h3>
          <p className="text-primary-500 mb-6">
            Connect to eBay in Settings and import your listings to get started
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/settings"
              className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 hover-lift"
            >
              <LinkIcon className="-ml-1 mr-2 h-5 w-5" />
              Connect eBay
            </Link>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setIsProductModalOpen(true);
              }}
              className="inline-flex items-center px-6 py-3 border border-primary-200 text-primary-600 bg-white hover:bg-primary-50 rounded-xl font-medium transition-all duration-200 hover-lift"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Manual Product
            </button>
          </div>
        </div>
      )}

      {/* Products Grid/List */}
      {products.length > 0 && viewMode === 'grid' ? (
        <div className="mt-6 sm:mt-8 mobile-grid gap-4 sm:gap-6">
          {products.map((product, index) => (
            <div
              key={product.id} 
              className="group bg-white/80 backdrop-blur-sm mobile-card shadow-soft-shadow border border-primary-100 overflow-hidden hover-lift transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative">
                <div className="product-image-mobile bg-gradient-to-br from-primary-50 to-primary-100">
                  {product.images && product.images[0] && product.images[0].url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.title}
                      className="mobile-image product-image-mobile group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.log('Image failed to load:', product.images[0]?.url);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement?.classList.add('image-failed');
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', product.images[0]?.url);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 sm:h-40 lg:h-48 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
                      <div className="text-center">
                        <ShoppingBagIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-400 mx-auto mb-2" />
                        <span className="text-primary-500 text-xs sm:text-sm">No image</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-primary-700 line-clamp-2 group-hover:text-primary-800 transition-colors mb-2">
                  {product.title}
                </h3>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg sm:text-xl font-bold text-primary-600">${product.price}</p>
                  <p className="text-xs sm:text-sm text-primary-500 bg-primary-50 px-2 py-1 rounded-lg">Qty: {product.quantity}</p>
                </div>
                
                {/* Marketplace badges */}
                <div className="mb-4 flex flex-wrap gap-1 sm:gap-2">
                  {product.listings.map((listing, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getMarketplaceColor(listing.marketplace)} hover:scale-105 transition-transform duration-200`}
                    >
                      {listing.marketplace}
                    </span>
                  ))}
                </div>

                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 touch-target rounded-xl bg-primary-100/50 text-primary-600 hover:bg-primary-200 hover:text-primary-700 hover:shadow-glow-sm transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                    title="Edit Product"
                  >
                    <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    onClick={() => handleCrossList(product)}
                    className="flex-1 touch-target rounded-xl bg-green-100/50 text-green-600 hover:bg-green-200 hover:text-green-700 hover:shadow-glow-sm transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                    title="Cross-list Product"
                  >
                    <CloudArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 touch-target rounded-xl bg-red-100/50 text-red-600 hover:bg-red-200 hover:text-red-700 hover:shadow-glow-sm transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                    title="Delete Product"
                  >
                    <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 && viewMode === 'list' ? (
        <div className="mt-6 sm:mt-8 bg-white/80 backdrop-blur-sm shadow-soft-shadow border border-primary-100 overflow-hidden rounded-2xl">
          <ul className="divide-y divide-primary-200/50">
            {products.map((product, _index) => (
              <li key={product.id} className="hover-lift">
                <div className="px-3 py-4 sm:px-6 sm:py-5 lg:px-8 hover:bg-primary-50/30 transition-all duration-200">
                  {/* Mobile-first layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center flex-1">
                      <div className="relative flex-shrink-0">
                        {product.images && product.images[0] && product.images[0].url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="h-12 w-12 sm:h-16 sm:w-16 mobile-image rounded-xl shadow-lg"
                            loading="lazy"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              console.log('List view image failed to load:', product.images[0]?.url);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('List view image loaded successfully:', product.images[0]?.url);
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center shadow-lg">
                            <ShoppingBagIcon className="h-4 w-4 sm:h-6 sm:w-6 text-primary-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                        <p className="text-sm sm:text-base lg:text-lg font-semibold text-primary-700 truncate">{product.title}</p>
                        <p className="text-xs sm:text-sm text-primary-500">SKU: {product.sku || 'N/A'}</p>
                        <div className="mt-1 sm:mt-2 flex flex-wrap gap-1 sm:gap-2">
                          {product.listings.map((listing, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getMarketplaceColor(listing.marketplace)}`}
                            >
                              {listing.marketplace}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Price and actions section */}
                    <div className="flex items-center justify-between sm:justify-end sm:space-x-4 lg:space-x-6">
                      <div className="text-left sm:text-right">
                        <p className="text-lg sm:text-xl font-bold text-primary-600">${product.price}</p>
                        <p className="text-xs sm:text-sm text-primary-500 bg-primary-50 px-2 py-1 rounded-lg inline-block">Qty: {product.quantity}</p>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex space-x-1 sm:space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="touch-target rounded-xl bg-primary-100/50 text-primary-600 hover:bg-primary-200 hover:text-primary-700 hover:shadow-glow-sm transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                          title="Edit Product"
                        >
                          <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => handleCrossList(product)}
                          className="touch-target rounded-xl bg-green-100/50 text-green-600 hover:bg-green-200 hover:text-green-700 hover:shadow-glow-sm transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                          title="Cross-list Product"
                        >
                          <CloudArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="touch-target rounded-xl bg-red-100/50 text-red-600 hover:bg-red-200 hover:text-red-700 hover:shadow-glow-sm transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                          title="Delete Product"
                        >
                          <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Product Modal */}
      {isProductModalOpen && (
        <ProductModal
          product={selectedProduct}
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
            fetchProducts();
          }}
        />
      )}

      {/* Cross-List Modal */}
      {isCrossListModalOpen && selectedProductForCrossList && (
        <CrossListModal
          product={selectedProductForCrossList}
          isOpen={isCrossListModalOpen}
          onClose={() => {
            setIsCrossListModalOpen(false);
            setSelectedProductForCrossList(null);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
