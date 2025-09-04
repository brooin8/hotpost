import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.dashboardService.getDashboardStats(user.id);
  }

  @Get('activity')
  async getActivity(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    const dayCount = days ? parseInt(days) : 7;
    return this.dashboardService.getRecentActivity(user.id, dayCount);
  }

  @Get('chart')
  async getChartData(
    @CurrentUser() user: any,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.dashboardService.getChartData(user.id, period || 'week');
  }

  @Get('performance')
  async getPerformanceMetrics(@CurrentUser() user: any) {
    return this.dashboardService.getPerformanceMetrics(user.id);
  }

  @Get('savings')
  async getRelistingSavings(@CurrentUser() user: any) {
    const savings = await this.dashboardService.calculateRelistingSavings(user.id);
    return {
      total: savings,
      formatted: `$${savings.toFixed(2)}`,
      message: `You've saved $${savings.toFixed(2)} using smart relisting!`,
    };
  }
}
