import { deepSeekService } from '../services/deepseek';

export interface ProductData {
  title: string;
  description: string;
  price: number | null;
  brand: string;
  condition: 'new' | 'used' | 'like_new' | 'very_good' | 'good' | 'acceptable';
  tags: string[];
  sku: string;
}

export interface ScrapedData {
  url: string;
  title: string;
  content: string;
  imageUrl: string | null;
}

/**
 * Parse a product URL and extract product data using AI
 */
export async function parseProductFromUrl(url: string): Promise<{
  productData: ProductData;
  imageUrl: string | null;
}> {
  // First, scrape the webpage content
  const response = await fetch('/api/scrape-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch webpage content');
  }

  const scrapedData: ScrapedData = await response.json();

  // Use AI to analyze and extract product information
  const productData = await analyzeProductContent(scrapedData);

  return {
    productData,
    imageUrl: scrapedData.imageUrl
  };
}

/**
 * Use DeepSeek AI to analyze scraped content and extract product data
 */
export async function analyzeProductContent(scrapedData: ScrapedData): Promise<ProductData> {
  const systemPrompt = `You are an expert product data analyst specializing in extracting and optimizing product information for marketplace listings. Your goal is to create compelling, accurate, and SEO-friendly product listings.`;

  const userPrompt = `
Analyze this product webpage and extract key information to create an optimized marketplace listing.

**Webpage Details:**
- URL: ${scrapedData.url}
- Page Title: ${scrapedData.title}
- Content: ${scrapedData.content.substring(0, 4000)}

**Instructions:**
1. Create a compelling product title (max 80 characters) that includes key searchable terms
2. Write a detailed description (200-400 words) that highlights benefits, features, and appeal to buyers
3. Extract pricing information if available
4. Identify the brand/manufacturer
5. Determine the most likely condition
6. Generate relevant search tags/keywords
7. Create a logical SKU

**Required JSON Response Format:**
{
  "title": "SEO-optimized marketplace title (max 80 chars)",
  "description": "Compelling product description with features and benefits (200-400 words)",
  "price": 29.99,
  "brand": "Brand Name",
  "condition": "new",
  "tags": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "sku": "BRAND-MODEL-001"
}

**Guidelines:**
- Title should be descriptive and include key searchable terms
- Description should be persuasive and highlight key selling points
- Price should be extracted as a number, or null if not found
- Condition should be one of: new, used, like_new, very_good, good, acceptable
- Tags should be relevant search keywords (5-8 tags)
- SKU should be logical and based on brand/model if possible

Return ONLY the JSON response, no additional text.`;

  try {
    const aiResponse = await deepSeekService.generateText(userPrompt, {
      systemMessage: systemPrompt,
      temperature: 0.2, // Lower temperature for more consistent output
      max_tokens: 2000
    });

    // Parse the AI response
    let parsedData: ProductData;
    try {
      // Try to extract JSON from the response
      const cleanedResponse = aiResponse.trim();
      let jsonStr = cleanedResponse;
      
      // If response contains extra text, try to extract just the JSON part
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const rawData = JSON.parse(jsonStr);
      
      // Validate and clean the data
      parsedData = {
        title: (rawData.title || '').substring(0, 80).trim(),
        description: (rawData.description || '').trim(),
        price: typeof rawData.price === 'number' ? rawData.price : null,
        brand: (rawData.brand || '').trim(),
        condition: validateCondition(rawData.condition),
        tags: Array.isArray(rawData.tags) ? rawData.tags.slice(0, 8) : [],
        sku: (rawData.sku || generateFallbackSku()).trim()
      };

      // Validate required fields
      if (!parsedData.title) {
        parsedData.title = scrapedData.title.substring(0, 80) || 'Product';
      }
      if (!parsedData.description) {
        parsedData.description = `Product extracted from ${scrapedData.url}`;
      }

    } catch (parseError) {
      console.error('Failed to parse AI response:', {
        error: parseError,
        response: aiResponse.substring(0, 500)
      });
      
      // Fallback to basic extraction
      parsedData = createFallbackProductData(scrapedData);
    }

    return parsedData;

  } catch (error: any) {
    console.error('AI analysis error:', error);
    
    // Fallback to basic extraction if AI fails
    return createFallbackProductData(scrapedData);
  }
}

/**
 * Validate condition value
 */
function validateCondition(condition: string): ProductData['condition'] {
  const validConditions: ProductData['condition'][] = [
    'new', 'used', 'like_new', 'very_good', 'good', 'acceptable'
  ];
  
  if (validConditions.includes(condition as ProductData['condition'])) {
    return condition as ProductData['condition'];
  }
  
  return 'new'; // Default fallback
}

/**
 * Generate a fallback SKU
 */
function generateFallbackSku(): string {
  const timestamp = Date.now().toString().slice(-8);
  return `PROD-${timestamp}`;
}

/**
 * Create fallback product data when AI parsing fails
 */
function createFallbackProductData(scrapedData: ScrapedData): ProductData {
  // Basic title cleaning
  let title = scrapedData.title
    .replace(/\s*\|\s*.*$/, '') // Remove site name after |
    .replace(/\s*-\s*.*$/, '')  // Remove site name after -
    .trim()
    .substring(0, 80);

  if (!title) {
    title = 'Product';
  }

  // Basic price extraction from content
  let price: number | null = null;
  const priceMatch = scrapedData.content.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    price = parseFloat(priceMatch[1]);
  }

  // Basic brand extraction
  let brand = '';
  const brandKeywords = ['brand', 'manufacturer', 'made by'];
  for (const keyword of brandKeywords) {
    const regex = new RegExp(`${keyword}[:\\s]+([A-Za-z0-9\\s]{2,20})`, 'i');
    const match = scrapedData.content.match(regex);
    if (match) {
      brand = match[1].trim();
      break;
    }
  }

  // Generate basic tags from title and content
  const words = (title + ' ' + scrapedData.content.substring(0, 500))
    .toLowerCase()
    .match(/\b[a-z]{3,}\b/g) || [];
  
  const commonWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'you', 'can', 'will', 'have', 'been', 'was', 'were']);
  const uniqueWords = Array.from(new Set(words))
    .filter(word => !commonWords.has(word))
    .slice(0, 6);

  return {
    title,
    description: `Product from ${scrapedData.url}. ${scrapedData.content.substring(0, 300).trim()}...`,
    price,
    brand,
    condition: 'new',
    tags: uniqueWords,
    sku: generateFallbackSku()
  };
}

/**
 * Enhanced AI prompt for specific marketplace types
 */
export function createMarketplaceSpecificPrompt(scrapedData: ScrapedData, marketplace?: string): string {
  const basePrompt = `
Analyze this product webpage and create an optimized listing for ${marketplace || 'general marketplace'} selling.

**Source Data:**
URL: ${scrapedData.url}
Title: ${scrapedData.title}
Content: ${scrapedData.content.substring(0, 3500)}

**Output Requirements:**
- Title: Compelling, SEO-friendly (max 80 chars)
- Description: Detailed, benefit-focused (200-400 words)
- Price: Extract if available, null if not found
- Brand: Manufacturer/brand name
- Condition: Most appropriate condition level
- Tags: 6-8 relevant search keywords
- SKU: Logical product identifier

Focus on creating content that converts browsers into buyers!`;

  if (marketplace === 'ebay') {
    return basePrompt + `

**eBay-Specific Guidelines:**
- Include model numbers and compatibility info in title
- Mention condition clearly in description
- Add shipping and return policy mentions
- Use eBay-friendly keywords
- Include dimensions/specifications if available`;
  }

  return basePrompt;
}
