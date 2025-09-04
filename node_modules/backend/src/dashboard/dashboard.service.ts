import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sevenDaysAgo = subDays(now, 7);

    // Get product counts
    const [totalProducts, activeProducts, draftProducts] = await Promise.all([
      this.prisma.product.count({ where: { userId } }),
      this.prisma.product.count({ where: { userId, status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { userId, status: 'DRAFT' } }),
    ]);

    // Get marketplace listings count by marketplace
    const listingsByMarketplace = await this.prisma.listing.groupBy({
      by: ['marketplace'],
      where: {
        product: { userId },
      },
      _count: {
        id: true,
      },
    });

    // Get recent sales (last 30 days)
    const recentSales = await this.prisma.syncLog.count({
      where: {
        userId,
        action: 'CREATE',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Calculate total revenue (simplified - in real app would track actual sales)
    const products = await this.prisma.product.findMany({
      where: { userId },
      select: { price: true, quantity: true },
    });
    
    const totalRevenue = products.reduce((sum, p) => sum + (p.price * Math.min(p.quantity, 10)), 0);

    // Get sync status
    const [successfulSyncs, failedSyncs] = await Promise.all([
      this.prisma.syncLog.count({
        where: { userId, status: 'SUCCESS' },
      }),
      this.prisma.syncLog.count({
        where: { userId, status: 'FAILED' },
      }),
    ]);

    // Calculate savings from smart relisting
    const relistingSavings = await this.calculateRelistingSavings(userId);

    // Get activity for the past 7 days
    const recentActivity = await this.getRecentActivity(userId, 7);

    return {
      stats: {
        totalProducts,
        activeProducts,
        draftProducts,
        totalRevenue,
        recentSales,
        listingsByMarketplace: listingsByMarketplace.reduce((acc, item) => {
          acc[item.marketplace] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        syncStatus: {
          successful: successfulSyncs,
          failed: failedSyncs,
          rate: successfulSyncs > 0 ? (successfulSyncs / (successfulSyncs + failedSyncs)) * 100 : 0,
        },
        relistingSavings,
      },
      activity: recentActivity,
    };
  }

  async getRecentActivity(userId: string, days: number = 7) {
    const since = subDays(new Date(), days);

    const activities = await this.prisma.syncLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      include: {
        listing: {
          include: {
            product: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    return activities.map(log => ({
      id: log.id,
      type: log.action,
      marketplace: log.marketplace,
      productTitle: log.listing?.product?.title || 'Unknown Product',
      status: log.status,
      message: log.message || this.getActivityMessage(log.action, log.status),
      timestamp: log.createdAt,
    }));
  }

  private getActivityMessage(operation: string, status: string): string {
    const messages = {
      'CREATE_SUCCESS': 'Product listed successfully',
      'CREATE_ERROR': 'Failed to list product',
      'UPDATE_SUCCESS': 'Product updated successfully',
      'UPDATE_ERROR': 'Failed to update product',
      'DELETE_SUCCESS': 'Product removed successfully',
      'DELETE_ERROR': 'Failed to remove product',
      'SYNC_SUCCESS': 'Inventory synced successfully',
      'SYNC_ERROR': 'Failed to sync inventory',
      'RELIST_SUCCESS': 'Product smartly relisted',
      'RELIST_ERROR': 'Failed to relist product',
    };

    return messages[`${operation}_${status}`] || `${operation} ${status.toLowerCase()}`;
  }

  async calculateRelistingSavings(userId: string): Promise<number> {
    // Count Etsy smart relistings
    const smartRelistings = await this.prisma.syncLog.count({
      where: {
        userId,
        marketplace: 'ETSY',
        action: 'RELIST',
        status: 'SUCCESS',
      },
    });

    // Each smart relisting saves $0.20
    return smartRelistings * 0.20;
  }

  async getChartData(userId: string, period: 'week' | 'month' | 'year' = 'week') {
    const periods = {
      week: 7,
      month: 30,
      year: 365,
    };

    const days = periods[period];
    const since = subDays(new Date(), days);

    // Get daily product creation counts
    const productCreations = await this.prisma.product.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get daily listing counts
    const listingCreations = await this.prisma.listing.groupBy({
      by: ['createdAt'],
      where: {
        product: { userId },
        createdAt: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
    });

    // Format data for charts
    const chartData = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), i);
      const dateStr = date.toISOString().split('T')[0];
      
      chartData.push({
        date: dateStr,
        products: productCreations.filter(p => 
          p.createdAt.toISOString().split('T')[0] === dateStr
        )[0]?._count.id || 0,
        listings: listingCreations.filter(l => 
          l.createdAt.toISOString().split('T')[0] === dateStr
        )[0]?._count.id || 0,
      });
    }

    return chartData.reverse();
  }

  async getPerformanceMetrics(userId: string) {
    // Get listing performance by marketplace
    const marketplacePerformance = await this.prisma.listing.groupBy({
      by: ['marketplace', 'status'],
      where: {
        product: { userId },
      },
      _count: {
        id: true,
      },
    });

    // Get sync performance
    const syncPerformance = await this.prisma.syncLog.groupBy({
      by: ['marketplace', 'status'],
      where: {
        userId,
        createdAt: {
          gte: subDays(new Date(), 30),
        },
      },
      _count: {
        id: true,
      },
    });

    // Calculate best performing marketplace
    const marketplaceStats = {};
    marketplacePerformance.forEach(stat => {
      if (!marketplaceStats[stat.marketplace]) {
        marketplaceStats[stat.marketplace] = { active: 0, inactive: 0 };
      }
      if (stat.status === 'ACTIVE') {
        marketplaceStats[stat.marketplace].active = stat._count.id;
      } else {
        marketplaceStats[stat.marketplace].inactive = stat._count.id;
      }
    });

    // Calculate sync success rates
    const syncRates = {};
    syncPerformance.forEach(stat => {
      if (!syncRates[stat.marketplace]) {
        syncRates[stat.marketplace] = { success: 0, error: 0 };
      }
      if (stat.status === 'SUCCESS') {
        syncRates[stat.marketplace].success = stat._count.id;
      } else {
        syncRates[stat.marketplace].error = stat._count.id;
      }
    });

    return {
      marketplaceStats,
      syncRates,
      topMarketplace: Object.entries(marketplaceStats).sort((a: any, b: any) => 
        b[1].active - a[1].active
      )[0]?.[0] || null,
    };
  }
}
