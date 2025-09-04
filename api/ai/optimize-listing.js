export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, description, price, brand, condition, tags } = req.body;

    // Validate input
    if (!title?.trim() && !description?.trim()) {
      return res.status(400).json({
        error: 'Missing content',
        message: 'Please provide at least a title or description to optimize'
      });
    }

    console.log('🚀 AI optimizing listing:', { 
      title: title?.substring(0, 50) + '...', 
      descriptionLength: description?.length || 0 
    });

    // Get DeepSeek API key from environment
    const apiKey = process.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'API configuration error',
        message: 'DeepSeek API key not configured'
      });
    }

    // Create the optimization prompt
    const systemPrompt = `You are an expert e-commerce copywriter specializing in creating compelling product listings that drive sales. Your job is to optimize product titles and descriptions to be more attractive to buyers while maintaining accuracy.

Focus on:
- Creating attention-grabbing, benefit-focused titles
- Writing compelling descriptions that highlight value propositions
- Using persuasive language that builds desire
- Including relevant keywords for searchability
- Maintaining honesty and accuracy about the product
- Creating urgency and scarcity when appropriate
- Highlighting unique features and benefits

Always return valid JSON with optimized title, description, and relevant tags.`;

    const userPrompt = `Please optimize this product listing to be more attractive to buyers:

CURRENT LISTING:
Title: ${title || 'No title provided'}
Description: ${description || 'No description provided'}
Price: $${price || 'Not specified'}
Brand: ${brand || 'Not specified'}
Condition: ${condition || 'Not specified'}
Tags: ${tags || 'Not specified'}

OPTIMIZATION REQUIREMENTS:
1. Make the title more compelling and benefit-focused (keep under 80 characters)
2. Rewrite the description to be more persuasive and buyer-focused
3. Add emotional triggers and urgency where appropriate
4. Highlight key features and benefits
5. Include relevant tags for better searchability
6. Keep all information accurate and truthful

Return ONLY a valid JSON object with this structure:
{
  "title": "optimized title here",
  "description": "optimized description here",
  "tags": "tag1, tag2, tag3, tag4, tag5"
}`;

    // Call DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    });

    if (!deepseekResponse.ok) {
      const error = await deepseekResponse.text();
      console.error('DeepSeek API error:', error);
      return res.status(500).json({
        error: 'AI service error',
        message: 'Failed to optimize listing with AI'
      });
    }

    const aiResponse = await deepseekResponse.json();
    
    if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
      throw new Error('Invalid response from AI service');
    }

    const optimizedContent = JSON.parse(aiResponse.choices[0].message.content);

    console.log('✅ AI optimization completed:', {
      originalTitleLength: title?.length || 0,
      optimizedTitleLength: optimizedContent.title?.length || 0,
      originalDescLength: description?.length || 0,
      optimizedDescLength: optimizedContent.description?.length || 0
    });

    // Return optimized content
    return res.status(200).json({
      title: optimizedContent.title || title,
      description: optimizedContent.description || description,
      tags: optimizedContent.tags || tags,
      optimization: {
        improvements: [
          'Enhanced title for better appeal',
          'Improved description with persuasive language',
          'Added relevant keywords and tags',
          'Included emotional triggers and benefits'
        ],
        aiProvider: 'DeepSeek',
        optimizedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI optimization error:', error);
    
    // Return helpful error message
    return res.status(500).json({
      error: 'Optimization failed',
      message: error.message || 'An error occurred while optimizing your listing',
      details: 'Please try again or check if your listing content is suitable for optimization'
    });
  }
}
