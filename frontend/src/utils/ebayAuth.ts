interface eBayConfig {
  appId: string;
  devId: string;
  certId: string;
  environment: 'sandbox' | 'production';
  redirectUri: string;
  runame?: string; // For legacy eBay apps
}

interface eBayAuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface eBayListing {
  itemId: string;
  title: string;
  description?: string;
  price: {
    value: string;
    currency: string;
  };
  quantity: number;
  sku?: string;
  images: string[];
  listingStatus: string;
  startTime: string;
  endTime: string;
  categoryPath: string;
}

class eBayAuthManager {
  private static instance: eBayAuthManager;
  private config: eBayConfig;

  constructor() {
    // Debug: Log raw environment variables
    console.log('🔍 Raw Environment Variables:', {
      VITE_EBAY_APP_ID: import.meta.env.VITE_EBAY_APP_ID,
      VITE_EBAY_ENVIRONMENT: import.meta.env.VITE_EBAY_ENVIRONMENT,
      VITE_EBAY_REDIRECT_URI: import.meta.env.VITE_EBAY_REDIRECT_URI,
      VITE_EBAY_RUNAME: import.meta.env.VITE_EBAY_RUNAME
    });

    this.config = {
      appId: 'AndrewCa-freelist-PRD-88135f6e7-3e259810', // Production client ID
      devId: import.meta.env.VITE_EBAY_DEV_ID?.trim(),
      certId: import.meta.env.VITE_EBAY_CERT_ID?.trim(),
      environment: 'production', // Hardcoded to force production
      redirectUri: import.meta.env.VITE_EBAY_REDIRECT_URI?.trim() || window.location.origin + '/auth/callback',
      // Force OAuth 2.0 by explicitly setting runame to undefined
      runame: undefined,
    };
    
    console.log('eBay Auth Config:', {
      appId: this.config.appId,
      environment: this.config.environment,
      redirectUri: this.config.redirectUri,
      hasRuName: !!this.config.runame,
      willUseOAuth2: !this.config.runame
    });
  }

  static getInstance(): eBayAuthManager {
    if (!eBayAuthManager.instance) {
      eBayAuthManager.instance = new eBayAuthManager();
    }
    return eBayAuthManager.instance;
  }

  private getAuthUrl(): string {
    return this.config.environment === 'sandbox'
      ? 'https://auth.sandbox.ebay.com'
      : 'https://auth.ebay.com';
  }

  // Get Session ID for legacy Auth'n'auth flow
  async getSessionId(): Promise<string> {
    if (!this.config.runame) {
      throw new Error('RuName is required for legacy eBay authentication');
    }

    // This would normally call eBay's GetSessionID API
    // For now, we'll generate a temporary session ID
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('Generated session ID:', sessionId);
    return sessionId;
  }

  // Generate eBay auth URL
  generateAuthUrl(state?: string): string {
    if (!this.config.appId) {
      throw new Error('eBay App ID not configured. Please check your .env file.');
    }

    // Check if we should use runame-based flow or standard OAuth
    if (this.config.runame) {
      // Legacy runame-based flow - needs session ID
      const sessionId = 'test_sess_' + Date.now();
      const authUrl = `https://signin.sandbox.ebay.com/ws/eBayISAPI.dll?SignIn&runame=${this.config.runame}&SessID=${sessionId}`;
      console.log('Using legacy eBay runame flow:', authUrl);
      localStorage.setItem('ebay_session_id', sessionId);
      return authUrl;
    }

    // Standard OAuth flow - comprehensive scopes for marketplace listing app
    console.log('🚀 Using eBay OAuth 2.0 flow (no RuName detected)');
    
    // Use the comprehensive scope list from eBay Developer Console
    const scopes = [
      'https://api.ebay.com/oauth/api_scope',
      'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
      'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.finances',
      'https://api.ebay.com/oauth/api_scope/sell.payment.dispute',
      'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.reputation',
      'https://api.ebay.com/oauth/api_scope/sell.reputation.readonly',
      'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription',
      'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.stores',
      'https://api.ebay.com/oauth/api_scope/sell.stores.readonly',
      'https://api.ebay.com/oauth/scope/sell.edelivery',
      'https://api.ebay.com/oauth/api_scope/commerce.vero'
    ];

    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state || 'ebay_auth_' + Date.now()
    });

    const authUrl = `${this.getAuthUrl()}/oauth2/authorize?${params.toString()}`;
    console.log('🔗 Generated eBay OAuth 2.0 URL:', authUrl);
    console.log('📋 OAuth Parameters:', {
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      environment: this.config.environment,
      auth_base: this.getAuthUrl()
    });
    return authUrl;
  }

  // Exchange authorization code for access token
  async exchangeCodeForTokens(code: string): Promise<eBayAuthTokens> {
    // Use our proxy API to avoid CORS issues
    // When running locally, use the deployed API endpoint
    const apiUrl = window.location.hostname === 'localhost' 
      ? 'https://crosslist-pro-deepseek.vercel.app/api/ebay/auth/token'
      : '/api/ebay/auth/token';
    
    console.log('🔗 Making token request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.config.redirectUri
      })
    });

    console.log('🔍 API Response status:', response.status, response.statusText);
    console.log('🔍 API Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response text first to debug what we're actually receiving
    const responseText = await response.text();
    console.log('🔍 Raw API Response:', responseText.substring(0, 500)); // First 500 chars
    
    if (!response.ok) {
      throw new Error(`eBay token exchange failed: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 200)}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error(`Invalid JSON response from API. Received: ${responseText.substring(0, 200)}`);
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken: string): Promise<eBayAuthTokens> {
    // Use our proxy API to avoid CORS issues
    // When running locally, use the deployed API endpoint
    const apiUrl = window.location.hostname === 'localhost' 
      ? 'https://crosslist-pro-deepseek.vercel.app/api/ebay/auth/token'
      : '/api/ebay/auth/token';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`eBay token refresh failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Get user's eBay listings using proxy API
  async getUserListings(accessToken: string, limit: number = 50): Promise<eBayListing[]> {
    try {
      // Force fresh data by adding cache-busting parameters
      const timestamp = Date.now();
      const response = await fetch(`/api/ebay/listings?q=*&limit=${limit}&fresh=true&t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`eBay API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Transform eBay format to our format
      return this.transformeBayListings(data.itemSummaries || []);
    } catch (error) {
      console.error('Error fetching eBay listings:', error);
      throw error;
    }
  }

  // Transform eBay API response to our product format
  private transformeBayListings(items: any[]): eBayListing[] {
    return items.map(item => ({
      itemId: item.itemId,
      title: item.title,
      description: item.shortDescription || '',
      price: {
        value: item.price?.value || '0',
        currency: item.price?.currency || 'USD'
      },
      quantity: item.availableQuantity || 1,
      sku: item.mpn || '',
      images: item.image ? [item.image.imageUrl] : [],
      listingStatus: item.itemWebUrl ? 'active' : 'ended',
      startTime: item.itemCreationDate || new Date().toISOString(),
      endTime: item.itemEndDate || new Date().toISOString(),
      categoryPath: item.categories?.[0]?.categoryName || 'Other'
    }));
  }

  // Start eBay OAuth process
  async initiateAuth(): Promise<void> {
    const authUrl = this.generateAuthUrl();
    
    // Open OAuth URL in popup
    const popup = window.open(
      authUrl,
      'ebayAuth',
      'width=600,height=700,scrollbars=yes,toolbar=no,menubar=no'
    );

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('eBay authentication was cancelled'));
        }
      }, 1000);

      // Listen for message from popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'EBAY_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          resolve();
        } else if (event.data.type === 'EBAY_AUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          reject(new Error(event.data.error || 'eBay authentication failed'));
        }
      };

      window.addEventListener('message', messageListener);
    });
  }

  // Check if eBay credentials are configured
  isConfigured(): boolean {
    // For OAuth 2.0, we only need the client ID (appId)
    // devId and certId are only needed for Trading API calls
    return !!this.config.appId;
  }

  // Check if stored token is expired
  isTokenExpired(): boolean {
    const tokens = this.getStoredTokens();
    if (!tokens || !tokens.expires_in) return true;
    
    // Check if token expires within next 5 minutes
    const expirationTime = tokens.stored_at + (tokens.expires_in * 1000) - (5 * 60 * 1000);
    return Date.now() > expirationTime;
  }

  // Get stored tokens from localStorage
  getStoredTokens(): (eBayAuthTokens & { stored_at: number }) | null {
    const stored = localStorage.getItem('ebay_tokens');
    return stored ? JSON.parse(stored) : null;
  }

  // Store tokens in localStorage with timestamp
  storeTokens(tokens: eBayAuthTokens): void {
    const tokensWithTimestamp = {
      ...tokens,
      stored_at: Date.now()
    };
    localStorage.setItem('ebay_tokens', JSON.stringify(tokensWithTimestamp));
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    const storedTokens = this.getStoredTokens();
    if (!storedTokens) return null;

    if (!this.isTokenExpired()) {
      return storedTokens.access_token;
    }

    // Token is expired, try to refresh
    if (storedTokens.refresh_token) {
      try {
        console.log('eBay token expired, refreshing...');
        const newTokens = await this.refreshAccessToken(storedTokens.refresh_token);
        this.storeTokens(newTokens);
        return newTokens.access_token;
      } catch (error) {
        console.error('Failed to refresh eBay token:', error);
        // Clear invalid tokens
        localStorage.removeItem('ebay_tokens');
        return null;
      }
    }

    return null;
  }

  // Get token status for debugging
  getTokenStatus() {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      return { status: 'no_tokens', message: 'No eBay tokens stored' };
    }

    const isExpired = this.isTokenExpired();
    const expiresAt = new Date(tokens.stored_at + (tokens.expires_in * 1000));
    const hasRefreshToken = !!tokens.refresh_token;

    return {
      status: isExpired ? 'expired' : 'valid',
      expires_at: expiresAt.toISOString(),
      has_refresh_token: hasRefreshToken,
      time_until_expiry: isExpired ? 'expired' : Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60) + ' minutes'
    };
  }

  // Handle legacy eBay Auth'n'auth token
  storeLegacyToken(token: string): void {
    const legacyTokenData = {
      access_token: token,
      token_type: 'legacy_ebay_token',
      expires_in: 47304000, // 18 months in seconds (18 * 30 * 24 * 60 * 60)
      refresh_token: '', // Legacy tokens don't have refresh tokens
      stored_at: Date.now()
    };
    localStorage.setItem('ebay_tokens', JSON.stringify(legacyTokenData));
    console.log('Stored legacy eBay token (expires in 18 months)');
  }

  // Check if token is legacy format
  isLegacyToken(token: string): boolean {
    return token.startsWith('v^1.1#');
  }

  // Get configuration status for UI
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      environment: this.config.environment,
      appId: this.config.appId ? `${this.config.appId.slice(0, 10)}...` : 'Not set',
      missingCredentials: [
        !this.config.appId && 'App ID',
        !this.config.devId && 'Dev ID', 
        !this.config.certId && 'Cert ID'
      ].filter(Boolean)
    };
  }
}

// Export singleton instance
export const ebayAuthManager = eBayAuthManager.getInstance();
export type { eBayListing, eBayAuthTokens };
