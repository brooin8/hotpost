export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate that it's an eBay image URL for security
    const decodedUrl = decodeURIComponent(url);
    if (!decodedUrl.includes('ebayimg.com') && !decodedUrl.includes('ebaystatic.com')) {
      return res.status(400).json({ error: 'Only eBay images are allowed' });
    }

    console.log('🖼️ Proxying image:', decodedUrl);

    // Enhance the image quality before proxying
    const enhancedUrl = enhanceEbayImageQuality(decodedUrl);
    console.log('🚀 Enhanced URL:', enhancedUrl);

    // Fetch the image from eBay
    const imageResponse = await fetch(enhancedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.ebay.com/'
      }
    });

    if (!imageResponse.ok) {
      console.error('❌ Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return res.status(imageResponse.status).json({ 
        error: 'Failed to fetch image',
        status: imageResponse.status,
        url: enhancedUrl
      });
    }

    // Get the image content type
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    // Set appropriate headers for the image
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Stream the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    console.log('✅ Successfully proxied image:', enhancedUrl, `(${buffer.length} bytes)`);
    return res.send(buffer);

  } catch (error) {
    console.error('❌ Error proxying image:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

/**
 * Enhance eBay image URLs to get high-quality versions
 * eBay image URL formats:
 * $_12.JPG = 64x64 thumbnail
 * $_57.JPG = 300x300 medium 
 * $_1.JPG = full size (up to 1600px)
 */
function enhanceEbayImageQuality(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }
  
  // If URL already contains quality parameter, try to upgrade it
  if (url.includes('$_')) {
    // Replace common low-quality formats with high-quality
    const highQualityUrl = url
      .replace(/\$_\d+\.JPG/i, '$_1.JPG')        // Replace $_XX.JPG with $_1.JPG
      .replace(/\$_\d+\.JPEG/i, '$_1.JPEG')      // Replace $_XX.JPEG with $_1.JPEG
      .replace(/\$_\d+\.PNG/i, '$_1.PNG')        // Replace $_XX.PNG with $_1.PNG
      .replace(/\$_\d+\.GIF/i, '$_1.GIF');       // Replace $_XX.GIF with $_1.GIF
    
    return highQualityUrl;
  }
  
  // If URL doesn't have quality parameter, add high-quality one
  if (url.includes('i.ebayimg.com') && !url.includes('set_id')) {
    return url + '?set_id=8800005007'; // High quality set
  }
  
  // Return original URL if not an eBay image or already enhanced
  return url;
}
