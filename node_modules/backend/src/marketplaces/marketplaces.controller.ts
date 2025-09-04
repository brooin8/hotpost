import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MarketplacesService } from './marketplaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Marketplace } from '@prisma/client';

@ApiTags('marketplaces')
@Controller('marketplaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketplacesController {
  constructor(private readonly marketplacesService: MarketplacesService) {}

  @Get()
  @ApiOperation({ summary: 'Get available marketplaces' })
  getAvailableMarketplaces() {
    return Object.values(Marketplace);
  }

  @Get('connected')
  @ApiOperation({ summary: 'Get user connected marketplaces' })
  async getConnectedMarketplaces(@Request() req) {
    return this.marketplacesService.getConnectedMarketplaces(req.user.id);
  }

  @Get(':marketplace/auth-url')
  @ApiOperation({ summary: 'Get OAuth URL for marketplace' })
  getAuthUrl(
    @Param('marketplace') marketplace: Marketplace,
    @Request() req,
  ) {
    return {
      url: this.marketplacesService.getAuthUrl(marketplace, req.user.id),
    };
  }

  @Post(':marketplace/callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  async handleCallback(
    @Param('marketplace') marketplace: Marketplace,
    @Query('code') code: string,
    @Request() req,
  ) {
    await this.marketplacesService.handleOAuthCallback(
      marketplace,
      code,
      req.user.id,
    );
    return { success: true };
  }

  @Post('cross-list')
  @ApiOperation({ summary: 'Cross-list product to multiple marketplaces' })
  async crossListProduct(
    @Body() body: { productId: string; marketplaces: Marketplace[] },
    @Request() req,
  ) {
    return this.marketplacesService.crossListProduct(
      body.productId,
      body.marketplaces,
      req.user.id,
    );
  }

  @Post('sync-inventory')
  @ApiOperation({ summary: 'Sync inventory across marketplaces' })
  async syncInventory(
    @Body() body: { productId: string; quantity: number },
    @Request() req,
  ) {
    await this.marketplacesService.syncInventory(
      body.productId,
      body.quantity,
      req.user.id,
    );
    return { success: true };
  }

  @Delete(':marketplace/disconnect')
  @ApiOperation({ summary: 'Disconnect marketplace' })
  async disconnectMarketplace(
    @Param('marketplace') marketplace: Marketplace,
    @Request() req,
  ) {
    await this.marketplacesService.disconnectMarketplace(
      req.user.id,
      marketplace,
    );
    return { success: true };
  }
}
