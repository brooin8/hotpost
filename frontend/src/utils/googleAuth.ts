export class GoogleAuthManager {
  private static instance: GoogleAuthManager;

  static getInstance(): GoogleAuthManager {
    if (!GoogleAuthManager.instance) {
      GoogleAuthManager.instance = new GoogleAuthManager();
    }
    return GoogleAuthManager.instance;
  }

  async initialize(): Promise<void> {
    // No initialization needed for simple redirect flow
    return Promise.resolve();
  }

  async signIn(): Promise<void> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id_here.apps.googleusercontent.com') {
      throw new Error('Google Client ID not configured. Please update your .env file with a valid VITE_GOOGLE_CLIENT_ID.');
    }

    // Create the OAuth URL with standard callback
    const redirectUri = window.location.origin + '/auth/callback';
    const scope = 'openid email profile';
    const responseType = 'code'; // Use authorization code flow
    const state = `google_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${encodeURIComponent(state)}&` +
      `prompt=select_account`;

    console.log('Redirecting to Google OAuth:', {
      clientId: clientId.substring(0, 20) + '...',
      redirectUri,
      authUrl: authUrl.substring(0, 100) + '...'
    });

    // Redirect to Google OAuth
    window.location.href = authUrl;
  }

  signOut(): void {
    // Simple sign out - just clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

// Export singleton instance
export const googleAuthManager = GoogleAuthManager.getInstance();
