import { Marketplace } from '@prisma/client';

export interface MarketplaceCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  shopId?: string;
  shopName?: string;
}

export interface MarketplaceProduct {
  title: string;
  description: string;
  price: number;
  quantity: number;
  images: string[];
  sku?: string;
  brand?: string;
  condition?: string;
  categoryId?: string;
  tags?: string[];
  variants?: ProductVariant[];
  shippingInfo?: ShippingInfo;
  attributes?: Record<string, any>;
}

export interface ProductVariant {
  name: string;
  value: string;
  price?: number;
  quantity?: number;
  sku?: string;
}

export interface ShippingInfo {
  price: number;
  expeditedPrice?: number;
  processingTime?: number;
  carrier?: string;
  freeShipping?: boolean;
}

export interface MarketplaceListing {
  id: string;
  url: string;
  status: 'active' | 'sold' | 'expired' | 'draft';
  price: number;
  quantity: number;
  views?: number;
  watchers?: number;
  createdAt: Date;
  updatedAt?: Date;
  expiresAt?: Date;
}

export interface ListingResult {
  success: boolean;
  listing?: MarketplaceListing;
  error?: string;
  costSaved?: number;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  path?: string[];
  parentId?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
}

export interface MarketplaceAdapter {
  marketplace: Marketplace;
  
  // Authentication
  getAuthUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<MarketplaceCredentials>;
  refreshAccessToken(refreshToken: string): Promise<MarketplaceCredentials>;
  
  // Listing operations
  createListing(product: MarketplaceProduct, credentials: MarketplaceCredentials): Promise<ListingResult>;
  updateListing(listingId: string, product: MarketplaceProduct, credentials: MarketplaceCredentials): Promise<ListingResult>;
  deleteListing(listingId: string, credentials: MarketplaceCredentials): Promise<boolean>;
  getListing(listingId: string, credentials: MarketplaceCredentials): Promise<MarketplaceListing | null>;
  
  // Category operations
  getCategories(credentials: MarketplaceCredentials): Promise<MarketplaceCategory[]>;
  searchCategory(query: string, credentials: MarketplaceCredentials): Promise<MarketplaceCategory[]>;
  
  // Inventory operations
  updateInventory(listingId: string, quantity: number, credentials: MarketplaceCredentials): Promise<boolean>;
  
  // Analytics
  getListingAnalytics(listingId: string, credentials: MarketplaceCredentials): Promise<any>;
}
