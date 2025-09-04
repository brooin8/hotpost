import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LinkIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import useAuthStore from '../stores/authStore';

interface MarketplaceStatusProps {
  showActions?: boolean;
  compact?: boolean;
  onSync?: () => void;
}

export default function MarketplaceStatus({ 
  showActions = true, 
  compact = false,
  onSync
}: MarketplaceStatusProps) {
  const { marketplaces, connectEbay, checkMarketplaceConnections } = useAuthStore();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check connections on mount
    checkMarketplaceConnections();
  }, [checkMarketplaceConnections]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectEbay();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to eBay');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!marketplaces.ebay.connected) {
      toast.error('Please connect eBay first');
      return;
    }

    setSyncing(true);
    try {
      if (onSync) {
        await onSync();
      } else {
        // Default sync logic
        toast.success('Sync completed!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string, connected: boolean) => {
    if (connected) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    
    switch (status) {
      case 'token_expired':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'no_tokens':
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (status: string, connected: boolean) => {
    if (connected) return 'Connected';
    
    switch (status) {
      case 'token_expired':
        return 'Token Expired';
      case 'no_tokens':
        return 'Not Connected';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Error';
    }
  };

  const getStatusColor = (status: string, connected: boolean) => {
    if (connected) return 'text-green-600 bg-green-50/80';
    
    switch (status) {
      case 'token_expired':
        return 'text-orange-600 bg-orange-50/80';
      case 'no_tokens':
      case 'disconnected':
        return 'text-gray-600 bg-gray-50/80';
      default:
        return 'text-red-600 bg-red-50/80';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🏪</span>
          <div className="flex items-center space-x-1">
            {getStatusIcon(marketplaces.ebay.status, marketplaces.ebay.connected)}
            <span className={`text-sm font-medium px-2 py-1 rounded-lg ${getStatusColor(marketplaces.ebay.status, marketplaces.ebay.connected)}`}>
              eBay: {getStatusText(marketplaces.ebay.status, marketplaces.ebay.connected)}
            </span>
          </div>
        </div>
        
        {showActions && (
          <div className="flex space-x-2">
            {!marketplaces.ebay.connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              >
                {connecting ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-1" />
                )}
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            ) : (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              >
                {syncing ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-shadow border border-primary-100 p-6">
      <h3 className="text-lg font-semibold text-primary-700 mb-4 flex items-center">
        <LinkIcon className="h-5 w-5 mr-2" />
        Marketplace Connections
      </h3>
      
      <div className="space-y-4">
        {/* eBay Connection */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/50">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🏪</span>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-blue-700">eBay</h4>
                {getStatusIcon(marketplaces.ebay.status, marketplaces.ebay.connected)}
              </div>
              <p className={`text-sm ${getStatusColor(marketplaces.ebay.status, marketplaces.ebay.connected)}`}>
                {getStatusText(marketplaces.ebay.status, marketplaces.ebay.connected)}
                {marketplaces.ebay.error && ` - ${marketplaces.ebay.error}`}
              </p>
              {marketplaces.ebay.connected && marketplaces.ebay.scopes && (
                <p className="text-xs text-blue-600 mt-1">
                  Scopes: {marketplaces.ebay.scopes.length} permissions
                </p>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              {!marketplaces.ebay.connected || marketplaces.ebay.status === 'token_expired' ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {connecting ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LinkIcon className="h-4 w-4 mr-2" />
                  )}
                  {connecting ? 'Connecting...' : marketplaces.ebay.status === 'token_expired' ? 'Reconnect' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {syncing ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CloudArrowDownIcon className="h-4 w-4 mr-2" />
                  )}
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Future marketplaces */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/50 opacity-60">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎨</span>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-orange-700">Etsy</h4>
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Coming Soon</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl border border-purple-200/50 opacity-60">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📺</span>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-purple-700">Whatnot</h4>
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Coming Soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
