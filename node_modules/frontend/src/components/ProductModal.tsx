import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhotoIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { parseProductFromUrl } from '../utils/aiProductParser';

interface ProductModalProps {
  product?: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    quantity: '1',
    sku: '',
    brand: '',
    condition: 'new',
    tags: '',
  });
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiUrl, setAiUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [createOnEbay, setCreateOnEbay] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        quantity: product.quantity?.toString() || '1',
        sku: product.sku || '',
        brand: product.brand || '',
        condition: product.condition || 'new',
        tags: product.tags?.join(', ') || '',
      });
      if (product.images) {
        setImagePreview(product.images.map((img: any) => img.url));
      }
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreview(previews);
  };

  const handleAiParse = async () => {
    if (!aiUrl.trim()) {
      toast.error('Please enter a URL to parse');
      return;
    }

    setAiLoading(true);
    toast.loading('AI is analyzing the product URL...', { id: 'ai-parse' });

    try {
      // Use the AI parser utility
      const { productData, imageUrl } = await parseProductFromUrl(aiUrl);

      // Update form data with AI-generated content
      setFormData(prev => ({
        ...prev,
        title: productData.title || prev.title,
        description: productData.description || prev.description,
        price: productData.price ? productData.price.toString() : prev.price,
        brand: productData.brand || prev.brand,
        condition: productData.condition || prev.condition,
        tags: Array.isArray(productData.tags) ? productData.tags.join(', ') : prev.tags,
        sku: productData.sku || prev.sku
      }));

      // If there's an image URL, add it to preview
      if (imageUrl) {
        setImagePreview(prev => [imageUrl, ...prev]);
      }

      toast.success('Product data filled by AI! Review and adjust as needed.', { id: 'ai-parse' });
      setShowAiInput(false);
      setAiUrl('');

    } catch (error: any) {
      console.error('AI parsing error:', error);
      toast.error(error.message || 'Failed to parse URL with AI', { id: 'ai-parse' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleOptimizeListing = async () => {
    // Check if there's enough content to optimize
    if (!formData.title.trim() && !formData.description.trim()) {
      toast.error('Please fill in at least a title or description before optimizing');
      return;
    }

    setOptimizeLoading(true);
    toast.loading('AI is optimizing your listing to be more attractive to buyers...', { id: 'ai-optimize' });

    try {
      const response = await api.post('/ai/optimize-listing', {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        brand: formData.brand,
        condition: formData.condition,
        tags: formData.tags
      });

      const optimizedData = response.data;

      // Update form data with optimized content
      setFormData(prev => ({
        ...prev,
        title: optimizedData.title || prev.title,
        description: optimizedData.description || prev.description,
        tags: optimizedData.tags || prev.tags
      }));

      toast.success('🚀 Listing optimized by AI! Your title and description are now more compelling to buyers.', { id: 'ai-optimize' });

    } catch (error: any) {
      console.error('AI optimize error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to optimize listing';
      toast.error(`AI optimization failed: ${errorMessage}`, { id: 'ai-optimize' });
    } finally {
      setOptimizeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('Starting product save process...');

    try {
      // Prepare product data
      const productData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        quantity: formData.quantity,
        sku: formData.sku,
        brand: formData.brand,
        condition: formData.condition,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        createOnEbay: createOnEbay && !product // Only for new products
      };

      console.log('Submitting product data:', productData);

      let savedProduct;
      if (product) {
        // Update existing product using alternative endpoint
        console.log('Updating existing product with ID:', product.id);
        const updateData = { ...productData, id: product.id };
        console.log('Update data:', updateData);
        
        const response = await api.put(`/products/${product.id}`, updateData);
        console.log('Update response:', response.data);
        
        savedProduct = response.data;
        toast.success('Product updated successfully');
        
        // Check if this product has an eBay listing and sync changes (non-blocking)
        const hasEbayListing = product.listings?.some((listing: any) => listing.marketplace === 'EBAY');
        if (hasEbayListing) {
          // Make eBay sync non-blocking - don't await it
          console.log('Product has eBay listing, attempting eBay sync...');
          toast.loading('Syncing changes to eBay...', { id: 'ebay-sync' });
          
          // Get eBay tokens for API call
          const ebayTokens = localStorage.getItem('ebay_tokens');
          const userId = localStorage.getItem('user_id') || 
            JSON.parse(localStorage.getItem('user') || '{}').id || 'anonymous';
          
          const headers: any = {};
          if (ebayTokens) {
            headers['x-ebay-tokens'] = ebayTokens;
          }
          if (userId) {
            headers['x-user-id'] = userId;
          }
          
          console.log('Making eBay update call with headers:', {
            hasEbayTokens: !!ebayTokens,
            userId: userId
          });
          
          // Run eBay sync in background without blocking the main update
          api.post('/ebay/update-listing', {
            itemId: product.id, // eBay itemId is stored as product.id
            title: productData.title,
            description: productData.description,
            price: productData.price,
            quantity: productData.quantity,
            sku: productData.sku,
            brand: productData.brand,
            condition: productData.condition,
            tags: productData.tags
          }, { headers })
          .then(ebayUpdateResponse => {
            console.log('eBay sync response:', ebayUpdateResponse.data);
            const updates = ebayUpdateResponse.data.updates || [];
            const realApiUsed = ebayUpdateResponse.data.realApiCall || ebayUpdateResponse.data.ebayResponse?.realApiUsed;
            const apiMethod = ebayUpdateResponse.data.apiMethod;
            
            console.log('Success detection:', {
              realApiUsed,
              apiMethod,
              responseKeys: Object.keys(ebayUpdateResponse.data)
            });
            
            if (realApiUsed && apiMethod && apiMethod !== 'none') {
              toast.success(
                `✅ eBay listing updated successfully via ${apiMethod}! ${updates.join(', ')}`, 
                { 
                  id: 'ebay-sync',
                  duration: 4000,
                  icon: '🎉'
                }
              );
              
              // Auto-refresh the page after 2 seconds to show updated data
              setTimeout(() => {
                console.log('🔄 Auto-refreshing page to show updated eBay data...');
                window.location.reload();
              }, 2000);
              
            } else {
              // Check if it's a scope issue
              const needsReconnection = ebayUpdateResponse.data.ebayResponse?.needsReconnection;
              const isScope = ebayUpdateResponse.data.ebayResponse?.reason === 'insufficient_scopes';
              
              if (isScope || needsReconnection) {
                toast.error(
                  'eBay token needs reconnection: Your eBay connection lacks required permissions for updating listings. Please reconnect eBay in Settings with full inventory management permissions.', 
                  { 
                    id: 'ebay-sync',
                    duration: 8000,
                    icon: '🔑'
                  }
                );
              } else {
                // eBay API didn't actually update - provide helpful message
                toast.success('Product updated locally. eBay sync requires proper connection.', { id: 'ebay-sync' });
                console.log('🔧 eBay API update was simulated. Real API calls need proper authentication.');
              }
            }
          })
          .catch(ebayError => {
            console.error('eBay sync failed:', ebayError);
            
            // Enhanced user-friendly error messages with detailed explanations
            if (ebayError.response?.status === 404) {
              toast.error(
                'eBay Sync Failed: Item not found. This could mean the item ID is incorrect, ' +
                'or there may be an issue with your eBay authentication. ' +
                'Your product has been updated locally. Check console logs for details.', 
                { 
                  id: 'ebay-sync', 
                  duration: 8000,
                  icon: '⚠️'
                }
              );
            } else if (ebayError.response?.status === 401) {
              toast.error(
                'eBay Authentication Error: Your eBay access token has expired or is invalid. ' +
                'Please reconnect your eBay account in Settings to restore sync functionality.', 
                { 
                  id: 'ebay-sync', 
                  duration: 6000,
                  icon: '🔑'
                }
              );
            } else if (ebayError.response?.status === 403) {
              toast.error(
                'eBay Permission Error: Your eBay token lacks the required permissions for inventory management. ' +
                'Please reconnect your eBay account with full listing management permissions in Settings.', 
                { 
                  id: 'ebay-sync', 
                  duration: 6000,
                  icon: '🚫'
                }
              );
            } else if (ebayError.response?.status >= 500) {
              toast.error(
                'eBay Server Error: eBay\'s servers are currently unavailable. ' +
                'Your product has been updated locally. Please try syncing again later.', 
                { 
                  id: 'ebay-sync', 
                  duration: 5000,
                  icon: '😵'
                }
              );
            } else {
              const errorMessage = ebayError.response?.data?.message || ebayError.message || 'Unknown error';
              const detailedMessage = ebayError.response?.data?.details || '';
              
              toast.error(
                `eBay Sync Failed: ${errorMessage}${detailedMessage ? ' - ' + detailedMessage : ''}. ` +
                'Your product has been updated locally. Check console logs for technical details.', 
                { 
                  id: 'ebay-sync', 
                  duration: 6000,
                  icon: '❌'
                }
              );
            }
            
            // Enhanced console logging for debugging
            console.log('🛠️ eBay API Troubleshooting Info:');
            console.log('- Status Code:', ebayError.response?.status);
            console.log('- Error Details:', ebayError.response?.data);
            console.log('- Product ID:', product.id);
            console.log('- Update Data:', { title: productData.title, price: productData.price, quantity: productData.quantity });
            console.log('- eBay Tokens Available:', !!localStorage.getItem('ebay_tokens'));
            
            // Check if tokens have required scopes
            try {
              const ebayTokens = localStorage.getItem('ebay_tokens');
              if (ebayTokens) {
                const tokens = JSON.parse(ebayTokens);
                console.log('- Token Scopes:', tokens.scope);
                console.log('- Token Expiry:', tokens.expires_at || tokens.expiry);
                
                const requiredScopes = ['sell.inventory', 'sell.account'];
                const hasRequiredScopes = requiredScopes.some(scope => tokens.scope?.includes(scope));
                console.log('- Has Required Scopes:', hasRequiredScopes);
                
                if (!hasRequiredScopes) {
                  console.warn('⚠️ Missing required eBay scopes for listing management!');
                }
              }
            } catch (tokenError: any) {
              console.log('- Could not parse eBay tokens:', tokenError.message);
            }
          });
        }
      } else {
        // Create new product
        console.log('Creating new product');
        const response = await api.post('/products', productData);
        console.log('Create response:', response.data);
        
        savedProduct = response.data;
        toast.success('Product created successfully');
        
        // If user opted to create on eBay, attempt that too
        if (createOnEbay) {
          try {
            toast.loading('Creating eBay listing...', { id: 'ebay-create' });
            
            // Check if eBay is connected
            const ebayTokens = localStorage.getItem('ebay_tokens');
            if (!ebayTokens) {
              toast.error('eBay not connected. Please connect eBay in Settings first.', { id: 'ebay-create' });
            } else {
              // Call eBay listing creation API
              await createEbayListing(savedProduct);
              toast.success('Product created and listed on eBay!', { id: 'ebay-create' });
            }
          } catch (ebayError: any) {
            console.error('eBay listing creation failed:', ebayError);
            toast.error(`Product saved but eBay listing failed: ${ebayError.message}`, { id: 'ebay-create' });
          }
        }
      }
      
      console.log('Product save completed successfully');
      onClose();
    } catch (error: any) {
      console.error('Product save error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save product';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createEbayListing = async (productData: any) => {
    console.log('Creating eBay listing for product:', productData);
    
    try {
      // Get eBay tokens for API call
      const ebayTokens = localStorage.getItem('ebay_tokens');
      const userId = localStorage.getItem('user_id') || 
        JSON.parse(localStorage.getItem('user') || '{}').id || 'anonymous';
      
      if (!ebayTokens) {
        throw new Error('eBay not connected. Please connect eBay in Settings first.');
      }
      
      const headers: any = {
        'x-ebay-tokens': ebayTokens,
        'x-user-id': userId
      };
      
      console.log('Making eBay create listing call with headers:', {
        hasEbayTokens: !!ebayTokens,
        userId: userId
      });
      
      const response = await api.post('/ebay/create-listing', {
        title: productData.title,
        description: productData.description,
        price: productData.price,
        quantity: productData.quantity,
        sku: productData.sku,
        brand: productData.brand,
        condition: productData.condition,
        tags: productData.tags,
        images: productData.images || []
      }, { headers });
      
      console.log('✅ eBay listing created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('eBay listing creation failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create eBay listing';
      
      // Enhanced error messages for common issues
      if (error.response?.status === 401) {
        throw new Error('eBay authentication failed. Please reconnect your eBay account in Settings.');
      } else if (error.response?.status === 403) {
        throw new Error('Insufficient eBay permissions. Please reconnect with proper listing creation permissions.');
      } else if (error.response?.status === 400) {
        throw new Error(`eBay validation error: ${errorMessage}`);
      } else {
        throw new Error(errorMessage);
      }
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-2 sm:p-4 text-center sm:items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-t-2xl sm:rounded-lg bg-white text-left shadow-xl transition-all w-full sm:my-8 sm:w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto">
                <div className="bg-white px-3 pb-4 pt-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {product ? 'Edit Product' : 'New Product'}
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* AI URL Parser Section */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
                        <h4 className="text-sm font-medium text-purple-900">AI Product Parser</h4>
                      </div>
                      {!showAiInput && (
                        <button
                          type="button"
                          onClick={() => setShowAiInput(true)}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Fill with AI
                        </button>
                      )}
                    </div>
                    
                    {showAiInput && (
                      <div className="space-y-3">
                        <p className="text-xs text-purple-700">
                          Paste a product URL and AI will extract the title, description, price, and other details
                        </p>
                        <div className="flex space-x-2">
                          <input
                            type="url"
                            value={aiUrl}
                            onChange={(e) => setAiUrl(e.target.value)}
                            placeholder="https://example.com/product..."
                            className="flex-1 text-sm rounded-md border-purple-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                            disabled={aiLoading}
                          />
                          <button
                            type="button"
                            onClick={handleAiParse}
                            disabled={aiLoading || !aiUrl.trim()}
                            className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {aiLoading ? 'Analyzing...' : 'Parse'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAiInput(false);
                              setAiUrl('');
                            }}
                            className="px-2 py-2 text-xs text-gray-500 hover:text-gray-700"
                            disabled={aiLoading}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        {(formData.title.trim() || formData.description.trim()) && (
                          <button
                            type="button"
                            onClick={handleOptimizeListing}
                            disabled={optimizeLoading || (!formData.title.trim() && !formData.description.trim())}
                            className="flex items-center px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-md hover:from-orange-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            <SparklesIcon className="h-3 w-3 mr-1" />
                            {optimizeLoading ? 'Optimizing...' : 'Optimize Listing'}
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={4}
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      {(formData.title.trim() || formData.description.trim()) && (
                        <p className="mt-1 text-xs text-gray-500">
                          💡 Use "Optimize Listing" to make your title and description more attractive to buyers
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                          type="number"
                          required
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">SKU</label>
                        <input
                          type="text"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Brand</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Condition</label>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="new">New</option>
                        <option value="like_new">Like New</option>
                        <option value="very_good">Very Good</option>
                        <option value="good">Good</option>
                        <option value="acceptable">Acceptable</option>
                        <option value="used">Used</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="vintage, collectible, rare"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    {/* eBay Integration Option */}
                    {!product && (
                      <div className="flex items-center">
                        <input
                          id="create-on-ebay"
                          type="checkbox"
                          checked={createOnEbay}
                          onChange={(e) => setCreateOnEbay(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="create-on-ebay" className="ml-2 block text-sm text-gray-900">
                          Also create listing on eBay after saving
                        </label>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Images</label>
                      <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                        <div className="space-y-1 text-center">
                          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500">
                              <span>Upload files</span>
                              <input
                                type="file"
                                className="sr-only"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                      {imagePreview.length > 0 && (
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {imagePreview.map((preview, idx) => (
                            <img
                              key={idx}
                              src={preview}
                              alt={`Preview ${idx + 1}`}
                              className="h-20 w-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
