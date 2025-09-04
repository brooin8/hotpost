import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CsvService } from './csv.service';
import { CsvController } from './csv.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    MulterModule.register({}),
  ],
  controllers: [CsvController],
  providers: [CsvService],
  exports: [CsvService],
})
export class CsvModule {}
