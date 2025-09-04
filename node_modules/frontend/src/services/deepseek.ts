import axios, { type AxiosInstance } from 'axios';

// DeepSeek API types
export interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DeepSeekChatRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepSeekError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

class DeepSeekService {
  private client!: AxiosInstance;
  private apiKey: string;
  // private isInitialized: boolean = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('DeepSeek API key not found. DeepSeek features will be disabled.');
      return;
    }

    try {
      this.client = axios.create({
        baseURL: 'https://api.deepseek.com/v1',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      });

      // Add response interceptor for error handling
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.data?.error) {
            const deepSeekError: DeepSeekError = error.response.data;
            throw new Error(`DeepSeek API Error: ${deepSeekError.error.message}`);
          }
          throw error;
        }
      );
      
      console.log('DeepSeek service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DeepSeek service:', error);
    }
  }

  /**
   * Send a chat completion request to DeepSeek
   */
  async chatCompletion(request: DeepSeekChatRequest): Promise<DeepSeekChatResponse> {
    try {
      const response = await this.client.post<DeepSeekChatResponse>('/chat/completions', request);
      return response.data;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw error;
    }
  }

  /**
   * Simple text completion helper
   */
  async generateText(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      systemMessage?: string;
    }
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [];
    
    if (options?.systemMessage) {
      messages.push({ role: 'system', content: options.systemMessage });
    }
    
    messages.push({ role: 'user', content: prompt });

    const request: DeepSeekChatRequest = {
      model: options?.model || 'deepseek-chat',
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.max_tokens || 1000,
    };

    const response = await this.chatCompletion(request);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Chat with conversation history
   */
  async chat(
    messages: DeepSeekMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<string> {
    const request: DeepSeekChatRequest = {
      model: options?.model || 'deepseek-chat',
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.max_tokens || 1000,
    };

    const response = await this.chatCompletion(request);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Get available models (if supported by DeepSeek API)
   */
  async getModels(): Promise<any> {
    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }
}

// Export singleton instance with error handling
let deepSeekService: DeepSeekService;
try {
  deepSeekService = new DeepSeekService();
} catch (error) {
  console.warn('DeepSeek service initialization failed:', error);
  // Create a dummy service that doesn't crash the app
  deepSeekService = {
    chat: async () => 'DeepSeek service is currently unavailable. Please check your API key configuration.',
    generateText: async () => 'DeepSeek service is currently unavailable. Please check your API key configuration.',
    chatCompletion: async () => ({ choices: [{ message: { content: 'Service unavailable' } }] }),
    getModels: async () => ({ data: [] })
  } as any;
}

export { deepSeekService };

// Export class for custom instances
export default DeepSeekService;
