import { create } from 'zustand';
import api from '../services/api';
import { googleAuthManager } from '../utils/googleAuth';
import { ebayAuthManager } from '../utils/ebayAuth';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  ebayUser?: {
    username?: string;
    userId?: string;
    email?: string;
  };
}

interface MarketplaceConnection {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'token_expired' | 'no_tokens';
  scopes?: string[];
  expiresAt?: string;
  lastChecked?: string;
  error?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  marketplaces: {
    ebay: MarketplaceConnection;
  };
  
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  googleAuth: (googleToken: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  ebaySignIn: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  checkMarketplaceConnections: () => Promise<void>;
  fetchEbayUserInfo: () => Promise<void>;
  connectEbay: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  marketplaces: {
    ebay: {
      connected: false,
      status: 'disconnected'
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      set({ 
        user, 
        token: access_token, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signup: async (email: string, password: string, firstName?: string, lastName?: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/signup', { 
        email, 
        password, 
        firstName, 
        lastName 
      });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      set({ 
        user, 
        token: access_token, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  googleAuth: async (googleToken: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/google', { token: googleToken });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      set({ 
        user, 
        token: access_token, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  googleSignIn: async () => {
    set({ isLoading: true });
    try {
      // Trigger Google OAuth redirect
      await googleAuthManager.signIn();
      
      // The redirect will happen, so we don't need to do anything else here
      
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  ebaySignIn: async () => {
    set({ isLoading: true });
    try {
      // Check if eBay is configured
      if (!ebayAuthManager.isConfigured()) {
        throw new Error('eBay authentication is not configured. Please check your environment variables.');
      }
      
      // Redirect to eBay OAuth
      const authUrl = ebayAuthManager.generateAuthUrl('ebay_auth_' + Date.now());
      window.location.href = authUrl;
      
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear all eBay connection data
    localStorage.removeItem('ebay_tokens');
    localStorage.removeItem('ebay_user');
    
    // Clear cached product/inventory data
    localStorage.removeItem('products');
    localStorage.removeItem('cached_products');
    localStorage.removeItem('sync_data');
    localStorage.removeItem('dashboard_metrics');
    localStorage.removeItem('demo_data');
    
    // Clear any other marketplace data
    localStorage.removeItem('marketplaces');
    localStorage.removeItem('listings_cache');
    localStorage.removeItem('inventory_cache');
    
    // Reset store state completely
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false,
      marketplaces: {
        ebay: {
          connected: false,
          status: 'disconnected'
        }
      }
    });
    
    // Clear any global store data if it exists
    if (typeof window !== 'undefined' && (window as any).userProducts) {
      delete (window as any).userProducts;
    }
    
    console.log('🧹 All cached data cleared on logout');
  },

  checkAuth: async () => {
    let token = localStorage.getItem('token');
    let userData = localStorage.getItem('user');
    
    // Create default demo token if none exists
    if (!token) {
      token = 'demo_token_' + Date.now();
      localStorage.setItem('token', token);
    }

    try {
      // Check for demo mode or create default user
      if (!userData || userData === 'null') {
        // Check if we have eBay connection to create better user profile
        const ebayTokens = localStorage.getItem('ebay_tokens');
        let defaultUser: User;
        
        if (ebayTokens) {
          try {
            const tokens = JSON.parse(ebayTokens);
            // Create user profile with eBay connection
            defaultUser = {
              id: 'connected_seller',
              email: 'seller@ebay.com',
              firstName: 'Connected eBay',
              lastName: 'Seller',
              ebayUser: {
                username: 'eBay Seller',
                userId: tokens.user_id || 'seller_' + Date.now(),
                email: 'seller@ebay.com'
              }
            };
          } catch (e) {
            // Fallback to default user
            defaultUser = {
              id: 'demo_user',
              email: 'demo@user.com',
              firstName: 'Demo',
              lastName: 'User'
            };
          }
        } else {
          // Default demo user
          defaultUser = {
            id: 'demo_user',
            email: 'demo@user.com',
            firstName: 'Demo',
            lastName: 'User'
          };
        }
        
        localStorage.setItem('user', JSON.stringify(defaultUser));
        set({ 
          user: defaultUser, 
          token,
          isAuthenticated: true 
        });
      } else {
        // Parse stored user data
        const user = JSON.parse(userData);
        set({ 
          user, 
          token,
          isAuthenticated: true 
        });
      }
      
      // Check marketplace connections after auth
      get().checkMarketplaceConnections();
    } catch (error) {
      console.error('Auth check error:', error);
      // Create fallback user even on error
      const fallbackUser: User = {
        id: 'fallback_user',
        email: 'user@demo.com',
        firstName: 'Demo',
        lastName: 'User'
      };
      
      localStorage.setItem('user', JSON.stringify(fallbackUser));
      set({ 
        user: fallbackUser, 
        token: token || 'demo_token',
        isAuthenticated: true 
      });
    }
  },

  checkMarketplaceConnections: async () => {
    try {
      // Check eBay connection status
      const response = await fetch('/api/ebay/auth/token?action=status', {
        headers: {
          'x-ebay-tokens': localStorage.getItem('ebay_tokens') || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        set(state => ({
          marketplaces: {
            ...state.marketplaces,
            ebay: data.marketplaces.ebay
          }
        }));
        
        // If eBay is connected, try to get user profile info
        if (data.marketplaces.ebay.connected) {
          get().fetchEbayUserInfo();
        }
      }
    } catch (error) {
      console.error('Failed to check marketplace connections:', error);
    }
  },
  
  fetchEbayUserInfo: async () => {
    try {
      const ebayTokens = localStorage.getItem('ebay_tokens');
      if (!ebayTokens) return;
      
      const tokens = JSON.parse(ebayTokens);
      
      // Try to get user profile from eBay API
      const response = await fetch('https://api.ebay.com/sell/account/v1/program', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });
      
      if (response.ok) {
        const programData = await response.json();
        
        // Note: Could add more user info fetching here if needed
        
        // Extract what info we can get
        const ebayUsername = programData.marketplaceId || programData.programType || 'eBay Seller';
        
        // Update user with eBay info
        set(state => {
          if (state.user) {
            const updatedUser = {
              ...state.user,
              firstName: 'Connected eBay',
              lastName: 'Seller',
              email: 'seller@ebay.com',
              ebayUser: {
                username: ebayUsername,
                userId: tokens.user_id || 'seller',
                email: 'seller@ebay.com'
              }
            };
            
            // Save to localStorage
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            return { user: updatedUser };
          }
          return state;
        });
      }
    } catch (error) {
      console.warn('Could not fetch eBay user info:', error);
    }
  },

  connectEbay: async () => {
    try {
      // Get OAuth URL from our API
      const response = await fetch('/api/ebay/auth/token?action=connect');
      const data = await response.json();
      
      if (data.authorizationUrl) {
        // Redirect to eBay OAuth
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error('Failed to generate eBay authorization URL');
      }
    } catch (error) {
      console.error('eBay connection error:', error);
      throw error;
    }
  },
}));

export default useAuthStore;
