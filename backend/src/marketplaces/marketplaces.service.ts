import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Marketplace, SyncAction, SyncStatus, Product } from '@prisma/client';
import { EbayAdapter } from './adapters/ebay.adapter';
import { EtsyAdapter } from './adapters/etsy.adapter';
import { WhatnotAdapter } from './adapters/whatnot.adapter';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceProduct,
  ListingResult,
} from './interfaces/marketplace.interface';

@Injectable()
export class MarketplacesService {
  private readonly logger = new Logger(MarketplacesService.name);
  private readonly adapters: Map<Marketplace, MarketplaceAdapter> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly websocket: WebsocketGateway,
  ) {
    // Initialize all marketplace adapters
    this.adapters.set(Marketplace.EBAY, new EbayAdapter(configService));
    this.adapters.set(Marketplace.ETSY, new EtsyAdapter(configService));
    this.adapters.set(Marketplace.WHATNOT, new WhatnotAdapter(configService));
  }

  /**
   * Get adapter for a specific marketplace
   */
  getAdapter(marketplace: Marketplace): MarketplaceAdapter {
    const adapter = this.adapters.get(marketplace);
    if (!adapter) {
      throw new NotFoundException(`Adapter for ${marketplace} not found`);
    }
    return adapter;
  }

  /**
   * Get OAuth URL for marketplace authentication
   */
  getAuthUrl(marketplace: Marketplace, userId: string): string {
    const adapter = this.getAdapter(marketplace);
    const state = Buffer.from(JSON.stringify({ userId, marketplace })).toString('base64');
    return adapter.getAuthUrl(state);
  }

  /**
   * Handle OAuth callback and save credentials
   */
  async handleOAuthCallback(
    marketplace: Marketplace,
    code: string,
    userId: string,
  ): Promise<void> {
    const adapter = this.getAdapter(marketplace);
    const credentials = await adapter.exchangeCodeForToken(code);

    // Save or update marketplace auth
    await this.prisma.marketplaceAuth.upsert({
      where: {
        userId_marketplace: {
          userId,
          marketplace,
        },
      },
      update: {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        shopId: credentials.shopId,
        shopName: credentials.shopName,
        isActive: true,
      },
      create: {
        userId,
        marketplace,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken || '',
        expiresAt: credentials.expiresAt,
        shopId: credentials.shopId,
        shopName: credentials.shopName,
        isActive: true,
      },
    });
  }

  /**
   * Get user's marketplace credentials
   */
  async getCredentials(
    userId: string,
    marketplace: Marketplace,
  ): Promise<MarketplaceCredentials | null> {
    const auth = await this.prisma.marketplaceAuth.findUnique({
      where: {
        userId_marketplace: {
          userId,
          marketplace,
        },
      },
    });

    if (!auth || !auth.isActive) {
      return null;
    }

    // Check if token needs refresh
    if (auth.expiresAt && auth.expiresAt < new Date() && auth.refreshToken) {
      const adapter = this.getAdapter(marketplace);
      const newCredentials = await adapter.refreshAccessToken(auth.refreshToken);
      
      // Update stored credentials
      await this.prisma.marketplaceAuth.update({
        where: { id: auth.id },
        data: {
          accessToken: newCredentials.accessToken,
          expiresAt: newCredentials.expiresAt,
        },
      });

      return newCredentials;
    }

    return {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken || undefined,
      expiresAt: auth.expiresAt || undefined,
      shopId: auth.shopId || undefined,
      shopName: auth.shopName || undefined,
    };
  }

  /**
   * Cross-list a product to multiple marketplaces
   */
  async crossListProduct(
    productId: string,
    marketplaces: Marketplace[],
    userId: string,
  ): Promise<Record<Marketplace, ListingResult>> {
    const results: Record<Marketplace, ListingResult> = {} as any;

    // Get product details
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        variants: true,
        categories: true,
      },
    });

    if (!product || product.userId !== userId) {
      throw new NotFoundException('Product not found');
    }

    // Convert to marketplace product format
    const marketplaceProduct = this.mapToMarketplaceProduct(product);

    // Emit start of cross-listing
    this.websocket.emitSyncProgress(userId, {
      operation: 'CROSS_LIST',
      current: 0,
      total: marketplaces.length,
      productTitle: product.title,
    });

    // Process each marketplace in parallel
    let completed = 0;
    const promises = marketplaces.map(async (marketplace) => {
      try {
        const credentials = await this.getCredentials(userId, marketplace);
        if (!credentials) {
          results[marketplace] = {
            success: false,
            error: 'Marketplace not connected',
          };
          return;
        }

        const adapter = this.getAdapter(marketplace);
        
        // Check if we already have a listing for this product on this marketplace
        const existingListing = await this.prisma.listing.findFirst({
          where: {
            productId,
            marketplace,
            status: { in: ['ACTIVE', 'EXPIRED'] },
          },
        });

        let result: ListingResult;

        if (existingListing) {
          // Update existing listing
          result = await adapter.updateListing(
            existingListing.marketplaceId,
            marketplaceProduct,
            credentials,
          );
        } else {
          // Create new listing
          result = await adapter.createListing(marketplaceProduct, credentials);
        }

        // Save listing to database
        if (result.success && result.listing) {
          await this.prisma.listing.upsert({
            where: {
              marketplace_marketplaceId: {
                marketplace,
                marketplaceId: result.listing.id,
              },
            },
            update: {
              status: 'ACTIVE',
              price: result.listing.price,
              quantity: result.listing.quantity,
              marketplaceUrl: result.listing.url,
              isSmartRelist: result.costSaved ? true : false,
            },
            create: {
              productId,
              marketplace,
              marketplaceId: result.listing.id,
              marketplaceUrl: result.listing.url,
              status: 'ACTIVE',
              price: result.listing.price,
              quantity: result.listing.quantity,
              isSmartRelist: result.costSaved ? true : false,
            },
          });

          // Log the sync action
          await this.prisma.syncLog.create({
            data: {
              userId,
              action: existingListing ? SyncAction.UPDATE : SyncAction.CREATE,
              marketplace,
              status: SyncStatus.SUCCESS,
              costSaved: result.costSaved,
              message: result.costSaved 
                ? `Smart relisted - saved $${result.costSaved}`
                : 'Listing created successfully',
            },
          });

          // Emit success notification
          this.websocket.emitListingUpdate(userId, {
            productId,
            marketplace,
            status: 'success',
            message: result.costSaved 
              ? `Smart relisted on ${marketplace} - saved $${result.costSaved}`
              : `Listed on ${marketplace}`,
          });
        } else {
          // Log failure
          await this.prisma.syncLog.create({
            data: {
              userId,
              action: existingListing ? SyncAction.UPDATE : SyncAction.CREATE,
              marketplace,
              status: SyncStatus.FAILED,
              message: result.error,
            },
          });

          // Emit error notification
          this.websocket.emitNotification(userId, {
            type: 'error',
            title: 'Listing Failed',
            message: `Failed to list on ${marketplace}: ${result.error}`,
          });
        }

        results[marketplace] = result;

        // Update progress
        completed++;
        this.websocket.emitSyncProgress(userId, {
          operation: 'CROSS_LIST',
          current: completed,
          total: marketplaces.length,
          marketplace,
          productTitle: product.title,
        });
      } catch (error) {
        this.logger.error(`Failed to list on ${marketplace}:`, error);
        results[marketplace] = {
          success: false,
          error: error.message,
        };

        // Emit error and update progress
        completed++;
        this.websocket.emitNotification(userId, {
          type: 'error',
          title: 'Listing Error',
          message: `Failed to list on ${marketplace}: ${error.message}`,
        });
        this.websocket.emitSyncProgress(userId, {
          operation: 'CROSS_LIST',
          current: completed,
          total: marketplaces.length,
          marketplace,
          productTitle: product.title,
        });
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Sync inventory across all marketplaces
   */
  async syncInventory(
    productId: string,
    quantity: number,
    userId: string,
  ): Promise<void> {
    const listings = await this.prisma.listing.findMany({
      where: {
        productId,
        status: 'ACTIVE',
      },
    });

    // Emit start of inventory sync
    this.websocket.emitSyncUpdate(userId, {
      operation: 'INVENTORY_SYNC',
      status: 'started',
      productId,
      marketplaces: listings.map(l => l.marketplace),
    });

    const promises = listings.map(async (listing) => {
      try {
        const credentials = await this.getCredentials(userId, listing.marketplace);
        if (!credentials) return;

        const adapter = this.getAdapter(listing.marketplace);
        await adapter.updateInventory(listing.marketplaceId, quantity, credentials);

        // Update local listing
        await this.prisma.listing.update({
          where: { id: listing.id },
          data: { quantity },
        });

        // Emit successful sync
        this.websocket.emitSyncUpdate(userId, {
          operation: 'INVENTORY_SYNC',
          status: 'success',
          marketplace: listing.marketplace,
          productId,
          quantity,
        });
      } catch (error) {
        this.logger.error(`Failed to sync inventory for ${listing.marketplace}:`, error);
        
        // Emit sync error
        this.websocket.emitSyncUpdate(userId, {
          operation: 'INVENTORY_SYNC',
          status: 'error',
          marketplace: listing.marketplace,
          productId,
          error: error.message,
        });
      }
    });

    await Promise.all(promises);

    // Emit completion
    this.websocket.emitSyncUpdate(userId, {
      operation: 'INVENTORY_SYNC',
      status: 'completed',
      productId,
    });
  }

  /**
   * Get connected marketplaces for a user
   */
  async getConnectedMarketplaces(userId: string): Promise<Marketplace[]> {
    const auths = await this.prisma.marketplaceAuth.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        marketplace: true,
      },
    });

    return auths.map(auth => auth.marketplace);
  }

  /**
   * Disconnect a marketplace
   */
  async disconnectMarketplace(
    userId: string,
    marketplace: Marketplace,
  ): Promise<void> {
    await this.prisma.marketplaceAuth.update({
      where: {
        userId_marketplace: {
          userId,
          marketplace,
        },
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Map internal product to marketplace product format
   */
  private mapToMarketplaceProduct(product: any): MarketplaceProduct {
    return {
      title: product.title,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      images: product.images.map((img: any) => img.url),
      sku: product.sku,
      brand: product.brand,
      condition: product.condition,
      tags: product.tags,
      variants: product.variants.map((v: any) => ({
        name: v.name,
        value: v.value,
        price: v.price,
        quantity: v.quantity,
        sku: v.sku,
      })),
      // Additional attributes can be added based on marketplace requirements
    };
  }
}
