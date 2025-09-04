import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Marketplace } from '@prisma/client';
import { BaseMarketplaceAdapter } from './base.adapter';
import {
  MarketplaceCredentials,
  MarketplaceProduct,
  MarketplaceListing,
  ListingResult,
  MarketplaceCategory,
} from '../interfaces/marketplace.interface';

@Injectable()
export class EbayAdapter extends BaseMarketplaceAdapter {
  marketplace = Marketplace.EBAY;
  private readonly baseUrl: string;
  private readonly authUrl: string;

  constructor(configService: ConfigService) {
    super(configService, 'eBay');
    
    const isSandbox = configService.get('EBAY_SANDBOX', 'true') === 'true';
    this.baseUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
    this.authUrl = isSandbox
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize';

    this.config = {
      clientId: configService.get('EBAY_CLIENT_ID', ''),
      clientSecret: configService.get('EBAY_CLIENT_SECRET', ''),
      redirectUri: configService.get('EBAY_REDIRECT_URI', ''),
      scope: [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
        'https://api.ebay.com/oauth/api_scope/sell.account',
      ],
    };
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state,
      scope: this.config.scope?.join(' ') || '',
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<MarketplaceCredentials> {
    try {
      const response = await this.httpClient.post(
        `${this.baseUrl.replace('api', 'auth')}/identity/v1/oauth2/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for token:', error);
      throw new Error('Failed to authenticate with eBay');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<MarketplaceCredentials> {
    try {
      const response = await this.httpClient.post(
        `${this.baseUrl.replace('api', 'auth')}/identity/v1/oauth2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
          },
        },
      );

      const { access_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh eBay token');
    }
  }

  async createListing(
    product: MarketplaceProduct,
    credentials: MarketplaceCredentials,
  ): Promise<ListingResult> {
    try {
      this.validateProduct(product);

      // First, create or update inventory item
      const inventoryItemId = product.sku || `SKU_${Date.now()}`;
      await this.createOrUpdateInventoryItem(inventoryItemId, product, credentials);

      // Create offer for the inventory item
      const offer = await this.createOffer(inventoryItemId, product, credentials);

      // Publish the offer
      const listing = await this.publishOffer(offer.offerId, credentials);

      return {
        success: true,
        listing: {
          id: listing.listingId,
          url: `https://www.ebay.com/itm/${listing.listingId}`,
          status: 'active',
          price: product.price,
          quantity: product.quantity,
          createdAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create eBay listing:', error);
      return {
        success: false,
        error: error.message || 'Failed to create listing',
      };
    }
  }

  async updateListing(
    listingId: string,
    product: MarketplaceProduct,
    credentials: MarketplaceCredentials,
  ): Promise<ListingResult> {
    try {
      this.validateProduct(product);

      // For eBay, we need to update the inventory item and offer
      const inventoryItemId = product.sku || listingId;
      
      // Update inventory item
      await this.createOrUpdateInventoryItem(inventoryItemId, product, credentials);

      // Update the offer
      const response = await this.httpClient.put(
        `${this.baseUrl}/sell/inventory/v1/offer/${listingId}`,
        this.buildOfferPayload(product),
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        listing: {
          id: listingId,
          url: `https://www.ebay.com/itm/${listingId}`,
          status: 'active',
          price: product.price,
          quantity: product.quantity,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to update eBay listing:', error);
      return {
        success: false,
        error: error.message || 'Failed to update listing',
      };
    }
  }

  async deleteListing(
    listingId: string,
    credentials: MarketplaceCredentials,
  ): Promise<boolean> {
    try {
      await this.httpClient.delete(
        `${this.baseUrl}/sell/inventory/v1/offer/${listingId}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
          },
        },
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to delete eBay listing:', error);
      return false;
    }
  }

  async getListing(
    listingId: string,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceListing | null> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/sell/inventory/v1/offer/${listingId}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
          },
        },
      );

      const offer = response.data;
      return {
        id: offer.offerId,
        url: `https://www.ebay.com/itm/${offer.listing?.listingId}`,
        status: this.mapEbayStatus(offer.status),
        price: offer.pricingSummary?.price?.value,
        quantity: offer.availableQuantity,
        createdAt: new Date(offer.createdDate),
        updatedAt: offer.lastModifiedDate ? new Date(offer.lastModifiedDate) : undefined,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getCategories(credentials: MarketplaceCredentials): Promise<MarketplaceCategory[]> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/commerce/taxonomy/v1/category_tree/0`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
          },
        },
      );

      return this.flattenCategories(response.data.rootCategoryNode);
    } catch (error) {
      this.logger.error('Failed to get eBay categories:', error);
      return [];
    }
  }

  async searchCategory(
    query: string,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceCategory[]> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/commerce/taxonomy/v1/category_tree/0/get_category_suggestions`,
        {
          params: { q: query },
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
          },
        },
      );

      return response.data.categorySuggestions.map((cat: any) => ({
        id: cat.categoryId,
        name: cat.categoryName,
        path: cat.categoryTreeNodeAncestors?.map((a: any) => a.categoryName),
      }));
    } catch (error) {
      this.logger.error('Failed to search eBay categories:', error);
      return [];
    }
  }

  async updateInventory(
    listingId: string,
    quantity: number,
    credentials: MarketplaceCredentials,
  ): Promise<boolean> {
    try {
      // Get the offer to find the inventory item
      const offer = await this.getListing(listingId, credentials);
      if (!offer) return false;

      // Update inventory
      await this.httpClient.put(
        `${this.baseUrl}/sell/inventory/v1/inventory_item/${offer.id}`,
        { availability: { shipToLocationAvailability: { quantity } } },
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to update eBay inventory:', error);
      return false;
    }
  }

  async getListingAnalytics(
    listingId: string,
    credentials: MarketplaceCredentials,
  ): Promise<any> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/sell/analytics/v1/traffic_report`,
        {
          params: {
            dimension: 'LISTING',
            filter: `listing_ids:{${listingId}}`,
            metric: 'LISTING_VIEWS_TOTAL,LISTING_VIEWERS',
          },
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get eBay analytics:', error);
      return null;
    }
  }

  // Private helper methods
  private async createOrUpdateInventoryItem(
    sku: string,
    product: MarketplaceProduct,
    credentials: MarketplaceCredentials,
  ): Promise<void> {
    const inventoryItem = {
      sku,
      product: {
        title: product.title,
        description: product.description,
        imageUrls: product.images,
        aspects: this.buildProductAspects(product),
      },
      condition: this.mapCondition(product.condition || 'used'),
      availability: {
        shipToLocationAvailability: {
          quantity: product.quantity,
        },
      },
    };

    await this.httpClient.put(
      `${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`,
      inventoryItem,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private async createOffer(
    sku: string,
    product: MarketplaceProduct,
    credentials: MarketplaceCredentials,
  ): Promise<any> {
    const offer = this.buildOfferPayload(product);
    offer.sku = sku;

    const response = await this.httpClient.post(
      `${this.baseUrl}/sell/inventory/v1/offer`,
      offer,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private async publishOffer(
    offerId: string,
    credentials: MarketplaceCredentials,
  ): Promise<any> {
    const response = await this.httpClient.post(
      `${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private buildOfferPayload(product: MarketplaceProduct): any {
    return {
      format: 'FIXED_PRICE',
      marketplaceId: 'EBAY_US',
      categoryId: product.categoryId || '625', // Default to "Other" category
      listingPolicies: {
        fulfillmentPolicyId: '0000000000',
        paymentPolicyId: '0000000000',
        returnPolicyId: '0000000000',
      },
      pricingSummary: {
        price: {
          currency: 'USD',
          value: product.price.toString(),
        },
      },
      listingDuration: 'GTC', // Good Till Cancelled
    };
  }

  private buildProductAspects(product: MarketplaceProduct): Record<string, string[]> {
    const aspects: Record<string, string[]> = {};
    
    if (product.brand) {
      aspects['Brand'] = [product.brand];
    }
    
    if (product.attributes) {
      Object.entries(product.attributes).forEach(([key, value]) => {
        aspects[key] = Array.isArray(value) ? value : [String(value)];
      });
    }

    return aspects;
  }

  private mapEbayStatus(status: string): 'active' | 'sold' | 'expired' | 'draft' {
    const statusMap: Record<string, 'active' | 'sold' | 'expired' | 'draft'> = {
      'PUBLISHED': 'active',
      'SOLD': 'sold',
      'ENDED': 'expired',
      'UNPUBLISHED': 'draft',
    };
    
    return statusMap[status] || 'draft';
  }

  private flattenCategories(node: any, path: string[] = []): MarketplaceCategory[] {
    const categories: MarketplaceCategory[] = [];
    
    if (node) {
      categories.push({
        id: node.categoryId,
        name: node.categoryName,
        path: [...path],
        parentId: path.length > 0 ? path[path.length - 1] : undefined,
      });

      if (node.childCategories) {
        node.childCategories.forEach((child: any) => {
          categories.push(...this.flattenCategories(child, [...path, node.categoryName]));
        });
      }
    }

    return categories;
  }
}
