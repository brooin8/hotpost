import { deepSeekService } from '../services/deepseek';

export interface ProductData {
  title?: string;
  description?: string;
  category?: string;
  brand?: string;
  features?: string[];
  price?: number;
  condition?: string;
}

export class DeepSeekHelpers {
  /**
   * Generate a product description based on product data
   */
  static async generateProductDescription(productData: ProductData): Promise<string> {
    const prompt = `
Please write a compelling product description for an e-commerce listing with the following details:

Product Title: ${productData.title || 'Not specified'}
Brand: ${productData.brand || 'Not specified'}
Category: ${productData.category || 'Not specified'}
Price: ${productData.price ? `$${productData.price}` : 'Not specified'}
Condition: ${productData.condition || 'Not specified'}
Key Features: ${productData.features?.join(', ') || 'Not specified'}
Current Description: ${productData.description || 'None provided'}

Requirements:
- Write 2-3 paragraphs
- Highlight key benefits and features
- Use persuasive but professional language
- Include SEO-friendly keywords naturally
- Focus on what makes this product valuable to buyers
- End with a call to action

Generate only the description text, no additional formatting or explanations.
    `.trim();

    return await deepSeekService.generateText(prompt, {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 500,
      systemMessage: 'You are an expert e-commerce copywriter who creates compelling product descriptions that drive sales.'
    });
  }

  /**
   * Optimize an existing product title for better search visibility
   */
  static async optimizeProductTitle(currentTitle: string, category?: string, keywords?: string[]): Promise<string> {
    const prompt = `
Please optimize this product title for better search visibility and click-through rates:

Current Title: "${currentTitle}"
Category: ${category || 'Not specified'}
Target Keywords: ${keywords?.join(', ') || 'Not specified'}

Requirements:
- Keep under 80 characters if possible
- Include the most important keywords early
- Make it compelling and clickable
- Follow e-commerce best practices
- Maintain accuracy and clarity

Provide only the optimized title, no explanations.
    `.trim();

    return await deepSeekService.generateText(prompt, {
      model: 'deepseek-chat',
      temperature: 0.6,
      max_tokens: 100,
      systemMessage: 'You are an expert at optimizing product titles for maximum search visibility and conversion rates.'
    });
  }

  /**
   * Generate keywords for a product
   */
  static async generateKeywords(productData: ProductData): Promise<string[]> {
    const prompt = `
Generate relevant keywords for this product that would help with search visibility:

Product: ${productData.title || 'Not specified'}
Brand: ${productData.brand || 'Not specified'}
Category: ${productData.category || 'Not specified'}
Features: ${productData.features?.join(', ') || 'Not specified'}
Description: ${productData.description || 'Not specified'}

Provide 10-15 relevant keywords that potential buyers might search for. Include:
- Product type keywords
- Brand-related terms
- Feature-based keywords
- Use case keywords
- Alternative names

Format as a comma-separated list only, no explanations.
    `.trim();

    const response = await deepSeekService.generateText(prompt, {
      model: 'deepseek-chat',
      temperature: 0.5,
      max_tokens: 200,
      systemMessage: 'You are an expert at keyword research for e-commerce products.'
    });

    // Parse the response into an array
    return response
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
  }

  /**
   * Suggest pricing strategy based on product data
   */
  static async suggestPricing(productData: ProductData, competitorPrices?: number[]): Promise<string> {
    const prompt = `
Provide pricing guidance for this product:

Product: ${productData.title || 'Not specified'}
Brand: ${productData.brand || 'Not specified'}
Category: ${productData.category || 'Not specified'}
Condition: ${productData.condition || 'Not specified'}
Current Price: ${productData.price ? `$${productData.price}` : 'Not set'}
Competitor Prices: ${competitorPrices?.map(p => `$${p}`).join(', ') || 'Not available'}

Please provide:
1. Recommended price range
2. Reasoning for the recommendation
3. Pricing strategy tips
4. Factors to consider

Keep the response concise and actionable.
    `.trim();

    return await deepSeekService.generateText(prompt, {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 400,
      systemMessage: 'You are an expert at e-commerce pricing strategy with deep knowledge of market dynamics and consumer psychology.'
    });
  }

  /**
   * Analyze and improve listing performance
   */
  static async analyzeListing(productData: ProductData, views?: number, sales?: number): Promise<string> {
    const prompt = `
Analyze this product listing and suggest improvements:

Product Title: ${productData.title || 'Not specified'}
Description: ${productData.description || 'Not specified'}
Price: ${productData.price ? `$${productData.price}` : 'Not specified'}
Category: ${productData.category || 'Not specified'}
Views: ${views || 'Not available'}
Sales: ${sales || 'Not available'}

Please provide:
1. Overall assessment of the listing
2. Specific areas for improvement
3. Actionable recommendations
4. Potential reasons for low performance (if applicable)

Keep recommendations practical and specific.
    `.trim();

    return await deepSeekService.generateText(prompt, {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 600,
      systemMessage: 'You are an expert e-commerce consultant who helps sellers optimize their listings for maximum visibility and sales.'
    });
  }
}

export default DeepSeekHelpers;
