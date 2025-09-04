import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketplacesService } from './marketplaces.service';
import { MarketplacesController } from './marketplaces.controller';
import { EbayAdapter } from './adapters/ebay.adapter';
import { EtsyAdapter } from './adapters/etsy.adapter';
import { WhatnotAdapter } from './adapters/whatnot.adapter';

@Module({
  imports: [ConfigModule],
  controllers: [MarketplacesController],
  providers: [
    MarketplacesService,
    EbayAdapter,
    EtsyAdapter,
    WhatnotAdapter,
  ],
  exports: [MarketplacesService],
})
export class MarketplacesModule {}
