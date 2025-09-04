# Google OAuth Setup Guide

## 1. Google Cloud Console Setup

### Step 1: Create/Configure Project
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Name it something like "CrossList Pro Dev"

### Step 2: Enable APIs
1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Google+ API** (or **Google Identity and Access Management API**)
   - **People API** (recommended)

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for testing with personal accounts)
3. Fill in required fields:
   - **App name**: CrossList Pro
   - **User support email**: your email
   - **App logo**: Optional for development
   - **App domain**: Leave empty for now
   - **Developer contact info**: your email
4. **Scopes**: Add these scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
5. **Test users**: Add your Gmail account for testing

### Step 4: Create OAuth 2.0 Client ID
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. **Application type**: Web application
4. **Name**: CrossList Pro Local Dev
5. **Authorized JavaScript origins**:
   ```
   http://localhost
   http://localhost:5173
   http://localhost:3000
   ```
6. **Authorized redirect URIs**: (Optional for now)
   ```
   http://localhost:5173
   http://localhost:5173/auth/callback
   ```
7. Click **Create**
8. **Copy the Client ID** - you'll need this!

## 2. Update Environment Variables

In your `.env` file, replace the placeholder with your actual Client ID:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
```

## 3. Test the Integration

1. Start your frontend dev server: `npm run dev`
2. Go to `http://localhost:5173/signup`
3. Click "Sign up with Google"
4. You should see Google's OAuth popup
5. After authorization, check browser console for any errors

## 4. Backend Integration (Next Step)

Your backend will need to handle the `/auth/google` endpoint that receives:

```json
{
  "googleId": "user_google_id",
  "email": "user@example.com",
  "name": "User Name", 
  "firstName": "User",
  "lastName": "Name",
  "picture": "https://profile-picture-url"
}
```

## 5. Troubleshooting

### Common Issues:
- **"Origin not allowed"**: Make sure you added `http://localhost:5173` to Authorized JavaScript origins
- **"Popup blocked"**: Allow popups for localhost in your browser
- **"Invalid client"**: Double-check your Client ID in `.env` file
- **Console errors**: Check browser dev tools for detailed error messages

### Development Tips:
- Use Chrome Incognito to test fresh OAuth flows
- Clear browser cache if you make changes to OAuth settings
- Test with multiple Google accounts to ensure it works generally

# Google OAuth Setup Instructions

## Frontend Setup

### 1. Install Google OAuth Dependencies

```bash
npm install react-google-login @google-oauth/react
```

### 2. Get Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add your domain to authorized origins:
   - `http://localhost:5173` (for development)
   - Your production domain
7. Copy the Client ID

### 3. Environment Configuration

1. Copy `.env.example` to `.env`
2. Replace `your_google_client_id_here` with your actual Google Client ID:

```
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
```

### 4. Update Google Auth Implementation

In `src/services/googleAuth.ts`, uncomment the implementation code and update the imports based on the library you choose.

### 5. Backend Integration

Update your backend to handle Google OAuth:

1. Create a new endpoint `POST /auth/google`
2. Verify the Google token server-side
3. Create or find the user in your database
4. Return your application's JWT token

Example backend endpoint (Node.js/Express):

```javascript
app.post('/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify Google token
    const googleUser = await verifyGoogleToken(token);
    
    // Find or create user
    let user = await User.findOne({ email: googleUser.email });
    if (!user) {
      user = await User.create({
        email: googleUser.email,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        avatar: googleUser.picture,
      });
    }
    
    // Generate JWT
    const jwt = generateJWT(user);
    
    res.json({
      access_token: jwt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid Google token' });
  }
});
```

## Current Status

- ✅ UI is ready with beautiful Google sign-in buttons
- ✅ Auth store has Google OAuth methods prepared
- ⏳ Waiting for Google OAuth library installation
- ⏳ Waiting for Google Client ID configuration
- ⏳ Backend Google OAuth endpoint needs to be created

## Notes

- The Google sign-in buttons are currently showing a "coming soon" message
- Once you complete the setup above, the integration will be fully functional
- The UI already matches your beautiful color scheme and includes hover animations
