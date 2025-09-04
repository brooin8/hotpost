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
import * as crypto from 'crypto';

@Injectable()
export class EtsyAdapter extends BaseMarketplaceAdapter {
  marketplace = Marketplace.ETSY;
  private readonly baseUrl = 'https://openapi.etsy.com/v3/application';
  private readonly authUrl = 'https://www.etsy.com/oauth/connect';
  private codeVerifier: string;
  private readonly LISTING_COST = 0.20; // $0.20 per new listing

  constructor(configService: ConfigService) {
    super(configService, 'Etsy');

    this.config = {
      clientId: configService.get('ETSY_API_KEY', ''),
      clientSecret: configService.get('ETSY_CLIENT_SECRET', ''),
      redirectUri: configService.get('ETSY_REDIRECT_URI', ''),
      scope: [
        'listings_r',
        'listings_w',
        'listings_d',
        'shops_r',
        'shops_w',
        'transactions_r',
      ],
    };
  }

  getAuthUrl(state: string): string {
    // Generate PKCE code verifier and challenge
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope?.join(' ') || '',
      client_id: this.config.clientId,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<MarketplaceCredentials> {
    try {
      const response = await this.httpClient.post(
        'https://api.etsy.com/v3/public/oauth/token',
        {
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri,
          code,
          code_verifier: this.codeVerifier,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Get shop info
      const shopInfo = await this.getShopInfo(access_token);

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        shopId: shopInfo.shop_id,
        shopName: shopInfo.shop_name,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for token:', error);
      throw new Error('Failed to authenticate with Etsy');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<MarketplaceCredentials> {
    try {
      const response = await this.httpClient.post(
        'https://api.etsy.com/v3/public/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
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
      throw new Error('Failed to refresh Etsy token');
    }
  }

  /**
   * Smart relisting for Etsy - Updates existing listing instead of creating new
   * This saves $0.20 per listing!
   */
  async smartRelist(
    existingListingId: string,
    product: MarketplaceProduct,
    credentials: MarketplaceCredentials,
  ): Promise<ListingResult> {
    try {
      this.validateProduct(product);

      // Update the existing listing with new details
      const updatePayload = this.buildListingPayload(product);
      
      const response = await this.httpClient.put(
        `${this.baseUrl}/listings/${existingListingId}`,
        updatePayload,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
            'Content-Type': 'application/json',
          },
        },
      );

      // Update images if provided
      if (product.images && product.images.length > 0) {
        await this.updateListingImages(existingListingId, product.images, credentials);
      }

      // Activate the listing if it was expired/sold
      await this.activateListing(existingListingId, credentials);

      const listing = response.data;
      
      this.logger.log(`Smart relisted Etsy listing ${existingListingId} - Saved $${this.LISTING_COST}`);

      return {
        success: true,
        listing: {
          id: listing.listing_id.toString(),
          url: listing.url,
          status: 'active',
          price: product.price,
          quantity: product.quantity,
          createdAt: new Date(listing.created_timestamp * 1000),
          updatedAt: new Date(listing.updated_timestamp * 1000),
        },
        costSaved: this.LISTING_COST, // $0.20 saved!
      };
    } catch (error) {
      this.logger.error('Failed to smart relist on Etsy:', error);
      return {
        success: false,
        error: error.message || 'Failed to smart relist',
      };
    }
  }

  async createListing(
    product: MarketplaceProduct,
    credentials: MarketplaceCredentials,
  ): Promise<ListingResult> {
    try {
      this.validateProduct(product);

      // Check if we have an existing expired/sold listing we can reuse
      const existingListing = await this.findReusableListing(product.sku, credentials);
      if (existingListing) {
        this.logger.log('Found reusable listing, using smart relist instead of creating new');
        return this.smartRelist(existingListing.id, product, credentials);
      }

      const listingPayload = this.buildListingPayload(product);

      const response = await this.httpClient.post(
        `${this.baseUrl}/shops/${credentials.shopId}/listings`,
        listingPayload,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
            'Content-Type': 'application/json',
          },
        },
      );

      const listing = response.data;

      // Upload images
      if (product.images && product.images.length > 0) {
        await this.uploadListingImages(listing.listing_id, product.images, credentials);
      }

      return {
        success: true,
        listing: {
          id: listing.listing_id.toString(),
          url: listing.url,
          status: 'active',
          price: product.price,
          quantity: product.quantity,
          createdAt: new Date(listing.created_timestamp * 1000),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create Etsy listing:', error);
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
    // For Etsy, update is the same as smart relist
    return this.smartRelist(listingId, product, credentials);
  }

  async deleteListing(
    listingId: string,
    credentials: MarketplaceCredentials,
  ): Promise<boolean> {
    try {
      await this.httpClient.delete(
        `${this.baseUrl}/listings/${listingId}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
          },
        },
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to delete Etsy listing:', error);
      return false;
    }
  }

  async getListing(
    listingId: string,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceListing | null> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/listings/${listingId}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
          },
        },
      );

      const listing = response.data;
      return {
        id: listing.listing_id.toString(),
        url: listing.url,
        status: this.mapEtsyStatus(listing.state),
        price: listing.price.amount / listing.price.divisor,
        quantity: listing.quantity,
        views: listing.views,
        createdAt: new Date(listing.created_timestamp * 1000),
        updatedAt: new Date(listing.updated_timestamp * 1000),
        expiresAt: listing.ending_tsz ? new Date(listing.ending_tsz * 1000) : undefined,
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
        `${this.baseUrl}/seller-taxonomy/nodes`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
          },
        },
      );

      return response.data.results.map((cat: any) => ({
        id: cat.id.toString(),
        name: cat.name,
        path: cat.full_path_taxonomy_ids?.map((id: number) => id.toString()),
        parentId: cat.parent_id?.toString(),
      }));
    } catch (error) {
      this.logger.error('Failed to get Etsy categories:', error);
      return [];
    }
  }

  async searchCategory(
    query: string,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceCategory[]> {
    // Etsy doesn't have a direct category search, so we'll filter from all categories
    const allCategories = await this.getCategories(credentials);
    const lowerQuery = query.toLowerCase();
    
    return allCategories.filter(cat => 
      cat.name.toLowerCase().includes(lowerQuery)
    );
  }

  async updateInventory(
    listingId: string,
    quantity: number,
    credentials: MarketplaceCredentials,
  ): Promise<boolean> {
    try {
      await this.httpClient.put(
        `${this.baseUrl}/listings/${listingId}/inventory`,
        {
          products: [{
            offerings: [{
              quantity,
              is_enabled: true,
            }],
          }],
        },
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
            'Content-Type': 'application/json',
          },
        },
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to update Etsy inventory:', error);
      return false;
    }
  }

  async getListingAnalytics(
    listingId: string,
    credentials: MarketplaceCredentials,
  ): Promise<any> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/shops/${credentials.shopId}/listings/${listingId}/transactions`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
          },
        },
      );

      return {
        transactions: response.data.results,
        count: response.data.count,
      };
    } catch (error) {
      this.logger.error('Failed to get Etsy analytics:', error);
      return null;
    }
  }

  // Private helper methods
  private async getShopInfo(accessToken: string): Promise<any> {
    const response = await this.httpClient.get(
      `${this.baseUrl}/users/me/shops`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': this.config.clientId,
        },
      },
    );

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }

    throw new Error('No Etsy shop found for this account');
  }

  private async findReusableListing(
    sku: string | undefined,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceListing | null> {
    if (!sku) return null;

    try {
      // Get all inactive listings
      const response = await this.httpClient.get(
        `${this.baseUrl}/shops/${credentials.shopId}/listings`,
        {
          params: {
            state: 'sold_out,expired,inactive',
            limit: 100,
          },
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
          },
        },
      );

      // Find listing with matching SKU
      for (const listing of response.data.results) {
        if (listing.sku?.includes(sku)) {
          return {
            id: listing.listing_id.toString(),
            url: listing.url,
            status: 'expired',
            price: listing.price.amount / listing.price.divisor,
            quantity: 0,
            createdAt: new Date(listing.created_timestamp * 1000),
          };
        }
      }
    } catch (error) {
      this.logger.warn('Failed to find reusable listing:', error);
    }

    return null;
  }

  private async activateListing(
    listingId: string,
    credentials: MarketplaceCredentials,
  ): Promise<void> {
    await this.httpClient.put(
      `${this.baseUrl}/listings/${listingId}`,
      { state: 'active' },
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'x-api-key': this.config.clientId,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private buildListingPayload(product: MarketplaceProduct): any {
    return {
      title: product.title.substring(0, 140), // Etsy title limit
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      sku: product.sku,
      taxonomy_id: product.categoryId ? parseInt(product.categoryId) : 1,
      tags: product.tags?.slice(0, 13), // Etsy allows max 13 tags
      materials: product.attributes?.materials,
      shipping_profile_id: product.attributes?.shipping_profile_id,
      return_policy_id: product.attributes?.return_policy_id,
      who_made: product.attributes?.who_made || 'i_did',
      when_made: product.attributes?.when_made || 'made_to_order',
      is_supply: false,
      should_auto_renew: true,
      state: 'active',
    };
  }

  private async uploadListingImages(
    listingId: string,
    images: string[],
    credentials: MarketplaceCredentials,
  ): Promise<void> {
    for (let i = 0; i < Math.min(images.length, 10); i++) { // Etsy allows max 10 images
      try {
        await this.httpClient.post(
          `${this.baseUrl}/listings/${listingId}/images`,
          {
            url: images[i],
            rank: i + 1,
          },
          {
            headers: {
              'Authorization': `Bearer ${credentials.accessToken}`,
              'x-api-key': this.config.clientId,
              'Content-Type': 'application/json',
            },
          },
        );
      } catch (error) {
        this.logger.warn(`Failed to upload image ${i + 1}:`, error);
      }
    }
  }

  private async updateListingImages(
    listingId: string,
    images: string[],
    credentials: MarketplaceCredentials,
  ): Promise<void> {
    try {
      // First, delete existing images
      const existingImages = await this.httpClient.get(
        `${this.baseUrl}/listings/${listingId}/images`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-api-key': this.config.clientId,
          },
        },
      );

      for (const image of existingImages.data.results) {
        await this.httpClient.delete(
          `${this.baseUrl}/listings/${listingId}/images/${image.listing_image_id}`,
          {
            headers: {
              'Authorization': `Bearer ${credentials.accessToken}`,
              'x-api-key': this.config.clientId,
            },
          },
        );
      }

      // Upload new images
      await this.uploadListingImages(listingId, images, credentials);
    } catch (error) {
      this.logger.warn('Failed to update listing images:', error);
    }
  }

  private mapEtsyStatus(state: string): 'active' | 'sold' | 'expired' | 'draft' {
    const statusMap: Record<string, 'active' | 'sold' | 'expired' | 'draft'> = {
      'active': 'active',
      'sold_out': 'sold',
      'expired': 'expired',
      'draft': 'draft',
      'inactive': 'draft',
    };
    
    return statusMap[state] || 'draft';
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}
