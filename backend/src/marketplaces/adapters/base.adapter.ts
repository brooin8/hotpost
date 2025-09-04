import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Marketplace } from '@prisma/client';
import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceProduct,
  MarketplaceListing,
  ListingResult,
  MarketplaceCategory,
  OAuthConfig,
} from '../interfaces/marketplace.interface';

@Injectable()
export abstract class BaseMarketplaceAdapter implements MarketplaceAdapter {
  protected readonly logger: Logger;
  protected readonly httpClient: AxiosInstance;
  protected config: OAuthConfig;
  
  abstract marketplace: Marketplace;

  constructor(
    protected readonly configService: ConfigService,
    marketplace: string,
  ) {
    this.logger = new Logger(`${marketplace}Adapter`);
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'CrossListingApp/1.0',
      },
    });

    // Add request/response interceptors for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error:', error);
        return Promise.reject(error);
      },
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response: ${response.status} from ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        this.logger.error(`Response error: ${error.response?.status} - ${error.message}`);
        return Promise.reject(error);
      },
    );
  }

  // Abstract methods that must be implemented by each adapter
  abstract getAuthUrl(state: string): string;
  abstract exchangeCodeForToken(code: string): Promise<MarketplaceCredentials>;
  abstract refreshAccessToken(refreshToken: string): Promise<MarketplaceCredentials>;
  abstract createListing(product: MarketplaceProduct, credentials: MarketplaceCredentials): Promise<ListingResult>;
  abstract updateListing(listingId: string, product: MarketplaceProduct, credentials: MarketplaceCredentials): Promise<ListingResult>;
  abstract deleteListing(listingId: string, credentials: MarketplaceCredentials): Promise<boolean>;
  abstract getListing(listingId: string, credentials: MarketplaceCredentials): Promise<MarketplaceListing | null>;
  abstract getCategories(credentials: MarketplaceCredentials): Promise<MarketplaceCategory[]>;
  abstract searchCategory(query: string, credentials: MarketplaceCredentials): Promise<MarketplaceCategory[]>;
  abstract updateInventory(listingId: string, quantity: number, credentials: MarketplaceCredentials): Promise<boolean>;
  abstract getListingAnalytics(listingId: string, credentials: MarketplaceCredentials): Promise<any>;

  // Common helper methods
  protected async handleApiError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    const message = (error.response?.data as any)?.message || error.message;

    if (status === 401) {
      throw new Error('Authentication failed. Please reconnect your account.');
    } else if (status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (status === 403) {
      throw new Error('Permission denied. Please check your account permissions.');
    } else {
      throw new Error(`API Error: ${message}`);
    }
  }

  protected async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          this.logger.warn(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  protected sanitizeDescription(description: string): string {
    // Remove HTML tags if not supported
    return description.replace(/<[^>]*>/g, '');
  }

  protected validateProduct(product: MarketplaceProduct): void {
    if (!product.title || product.title.length === 0) {
      throw new Error('Product title is required');
    }
    if (!product.description || product.description.length === 0) {
      throw new Error('Product description is required');
    }
    if (product.price <= 0) {
      throw new Error('Product price must be greater than 0');
    }
    if (product.quantity < 0) {
      throw new Error('Product quantity cannot be negative');
    }
    if (!product.images || product.images.length === 0) {
      throw new Error('At least one product image is required');
    }
  }

  protected mapCondition(condition: string): string {
    // Map generic conditions to marketplace-specific values
    const conditionMap: Record<string, string> = {
      'new': 'NEW',
      'like_new': 'LIKE_NEW',
      'very_good': 'VERY_GOOD',
      'good': 'GOOD',
      'acceptable': 'ACCEPTABLE',
      'used': 'USED',
    };
    
    return conditionMap[condition.toLowerCase()] || 'USED';
  }
}
