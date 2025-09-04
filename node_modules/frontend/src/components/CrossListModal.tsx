import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../services/api';

interface CrossListModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

const MARKETPLACES = [
  { id: 'EBAY', name: 'eBay', color: 'bg-blue-100 text-blue-800', icon: '🛒' },
  { id: 'ETSY', name: 'Etsy', color: 'bg-orange-100 text-orange-800', icon: '🎨' },
  { id: 'WHATNOT', name: 'Whatnot', color: 'bg-purple-100 text-purple-800', icon: '📱' },
];

export default function CrossListModal({ product, isOpen, onClose }: CrossListModalProps) {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [connectedMarketplaces, setConnectedMarketplaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetchConnectedMarketplaces();
  }, []);

  const fetchConnectedMarketplaces = async () => {
    try {
      const response = await api.get('/marketplaces/connected');
      setConnectedMarketplaces(response.data);
    } catch (error) {
      console.error('Failed to fetch connected marketplaces');
    }
  };

  const handleMarketplaceToggle = (marketplaceId: string) => {
    setSelectedMarketplaces(prev =>
      prev.includes(marketplaceId)
        ? prev.filter(id => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  const handleCrossList = async () => {
    if (selectedMarketplaces.length === 0) {
      toast.error('Please select at least one marketplace');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/marketplaces/cross-list', {
        productId: product.id,
        marketplaces: selectedMarketplaces,
      });
      
      setResults(response.data);
      
      // Count successes and failures
      const successes = Object.values(response.data).filter((r: any) => r.success).length;
      const failures = Object.values(response.data).filter((r: any) => !r.success).length;
      
      if (successes > 0 && failures === 0) {
        toast.success(`Successfully listed on ${successes} marketplace(s)`);
      } else if (successes > 0 && failures > 0) {
        toast.success(`Listed on ${successes} marketplace(s), ${failures} failed`);
      } else {
        toast.error('Failed to list on all marketplaces');
      }
      
      // Check for cost savings (Etsy smart relisting)
      const totalSaved = Object.values(response.data).reduce((acc: number, r: any) => 
        acc + (r.costSaved || 0), 0
      );
      
      if (totalSaved > 0) {
        toast.success(`💰 You saved $${totalSaved.toFixed(2)} with smart relisting!`, {
          duration: 5000,
          icon: '🎉',
        });
      }
    } catch (error) {
      toast.error('Failed to cross-list product');
    } finally {
      setLoading(false);
    }
  };

  const connectMarketplace = async (marketplaceId: string) => {
    try {
      const response = await api.get(`/marketplaces/${marketplaceId}/auth-url`);
      window.open(response.data.url, '_blank');
      toast.success('Please complete authentication in the new window');
    } catch (error) {
      toast.error('Failed to connect marketplace');
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
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Cross-List Product
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-500 mb-4">
                      Select marketplaces to list: <span className="font-medium">{product.title}</span>
                    </p>

                    {!results ? (
                      <div className="space-y-3">
                        {MARKETPLACES.map((marketplace) => {
                          const isConnected = connectedMarketplaces.includes(marketplace.id);
                          const isSelected = selectedMarketplaces.includes(marketplace.id);

                          return (
                            <div
                              key={marketplace.id}
                              className={`relative rounded-lg border p-4 ${
                                isConnected
                                  ? isSelected
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-2xl mr-3">{marketplace.icon}</span>
                                  <div>
                                    <p className="font-medium text-gray-900">{marketplace.name}</p>
                                    {!isConnected && (
                                      <p className="text-sm text-gray-500">Not connected</p>
                                    )}
                                  </div>
                                </div>
                                
                                {isConnected ? (
                                  <button
                                    onClick={() => handleMarketplaceToggle(marketplace.id)}
                                    className={`${
                                      isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-400 border border-gray-300'
                                    } rounded-md p-2`}
                                  >
                                    <CheckCircleIcon className="h-5 w-5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => connectMarketplace(marketplace.id)}
                                    className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                  >
                                    Connect
                                  </button>
                                )}
                              </div>
                              
                              {marketplace.id === 'ETSY' && isConnected && isSelected && (
                                <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                                  💡 Smart relisting enabled - Save $0.20 per listing!
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Cross-Listing Results:</h4>
                        {Object.entries(results).map(([marketplace, result]: [string, any]) => (
                          <div
                            key={marketplace}
                            className={`p-3 rounded-lg ${
                              result.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center">
                              {result.success ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                              ) : (
                                <ExclamationCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                              )}
                              <span className="font-medium">{marketplace}</span>
                            </div>
                            {result.success ? (
                              <div>
                                <p className="text-sm text-green-700 mt-1">
                                  Successfully listed
                                </p>
                                {result.costSaved && (
                                  <p className="text-sm text-green-700 font-medium">
                                    💰 Saved ${result.costSaved.toFixed(2)} with smart relisting!
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-red-700 mt-1">
                                {result.error || 'Failed to list'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    {!results ? (
                      <>
                        <button
                          type="button"
                          disabled={loading || selectedMarketplaces.length === 0}
                          onClick={handleCrossList}
                          className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50"
                        >
                          {loading ? 'Listing...' : 'Cross-List'}
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:col-span-2"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
