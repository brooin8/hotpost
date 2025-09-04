import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { MarketplacesModule } from './marketplaces/marketplaces.module';
import { CsvModule } from './csv/csv.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    MarketplacesModule,
    CsvModule,
    DashboardModule,
    WebsocketModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
