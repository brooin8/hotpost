# eBay API Integration Guide

## 1. eBay Developer Account Setup

### Step 1: Create eBay Developer Account
1. Go to [eBay Developers](https://developer.ebay.com/)
2. Sign up with your eBay seller account
3. Complete the developer application process

### Step 2: Create an Application
1. Go to **My Account** → **Applications**
2. Click **Create Application**
3. Fill in application details:
   - **Application Name**: CrossList Pro
   - **Description**: Cross-listing tool for eBay sellers
   - **Website URL**: Your website (can be localhost for development)

### Step 3: Get API Keys
You'll get these credentials:
- **App ID** (Client ID)
- **Dev ID** 
- **Cert ID** (Client Secret)
- **Redirect URI**

## 2. eBay API Types

### For Fetching Products/Listings:
- **Trading API**: For managing listings, orders, feedback
- **Browse API**: For searching and retrieving item details
- **Sell API**: For managing inventory and listings

### Key Endpoints:
- `GetMyeBaySelling`: Get your active listings
- `GetItem`: Get detailed item information
- `GetSellerList`: Get list of seller's items

## 3. Authentication

eBay uses OAuth 2.0 for authentication:

### Sandbox (Testing):
- **Base URL**: `https://api.sandbox.ebay.com/`
- **Auth URL**: `https://auth.sandbox.ebay.com/`

### Production:
- **Base URL**: `https://api.ebay.com/`
- **Auth URL**: `https://auth.ebay.com/`

## 4. Implementation Steps

### Environment Variables
Add to your `.env` file:

```env
# eBay API Configuration
VITE_EBAY_APP_ID=your_ebay_app_id
VITE_EBAY_CERT_ID=your_ebay_cert_id  
VITE_EBAY_DEV_ID=your_ebay_dev_id
VITE_EBAY_REDIRECT_URI=http://localhost:5173/auth/ebay/callback
VITE_EBAY_ENVIRONMENT=sandbox  # or 'production'
```

### Backend Implementation
Your backend needs to:
1. Handle eBay OAuth flow
2. Store user's eBay tokens securely
3. Make API calls to fetch listings
4. Transform eBay data to your product format

## 5. Product Import Flow

1. **User connects eBay account** → OAuth flow
2. **Backend fetches listings** → eBay API calls
3. **Transform data** → Convert eBay format to your schema
4. **Store products** → Save to your database
5. **Display in UI** → Show in products page

## 6. Sample eBay API Response

```json
{
  "ItemArray": {
    "Item": [
      {
        "ItemID": "123456789",
        "Title": "Vintage Leather Jacket",
        "Description": "Authentic vintage leather jacket from the 1980s",
        "StartPrice": {
          "currencyID": "USD",
          "value": "129.99"
        },
        "Quantity": "1",
        "SKU": "VLJ-001",
        "PictureDetails": {
          "PictureURL": ["https://ebay-image-url.jpg"]
        },
        "ListingDetails": {
          "StartTime": "2024-01-01T00:00:00.000Z",
          "EndTime": "2024-01-08T00:00:00.000Z"
        }
      }
    ]
  }
}
```

## 7. Next Steps

1. **Get eBay Developer credentials** (most important)
2. **Set up OAuth flow** in your backend
3. **Create product import endpoint** 
4. **Add "Connect eBay" button** to your UI
5. **Transform and store eBay listings**

## 8. Development Approach

### Option 1: Full Integration (Recommended)
- Set up real eBay API integration
- Handle OAuth authentication
- Import actual listings from eBay

### Option 2: Mock Development (Faster start)
- Use the mock backend I've set up
- Work on UI and features
- Add real eBay integration later

## 9. Marketplace Connection UI

Create a settings page where users can:
- Connect their eBay account
- Connect Etsy account  
- Connect Whatnot account
- View connection status
- Import products from each marketplace
