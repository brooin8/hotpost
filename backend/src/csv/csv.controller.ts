import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CsvService } from './csv.service';

@Controller('csv')
@UseGuards(JwtAuthGuard)
export class CsvController {
  constructor(private readonly csvService: CsvService) {}

  @Get('export')
  async exportProducts(
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.csvService.exportProducts(user.id);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csv);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
        return cb(new BadRequestException('Only CSV files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async importProducts(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('updateExisting') updateExisting?: string,
    @Query('skipDuplicates') skipDuplicates?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const options = {
      updateExisting: updateExisting === 'true',
      skipDuplicates: skipDuplicates === 'true',
    };

    return this.csvService.importProducts(file, user.id, options);
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const template = await this.csvService.generateTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product_template.csv"');
    res.send(template);
  }

  @Post('bulk')
  async bulkOperation(
    @CurrentUser() user: any,
    @Body() dto: {
      operation: 'DELETE' | 'ACTIVATE' | 'ARCHIVE';
      productIds: string[];
    },
  ) {
    if (!dto.operation || !dto.productIds || dto.productIds.length === 0) {
      throw new BadRequestException('Operation and productIds are required');
    }

    const count = await this.csvService.bulkOperation(
      dto.operation,
      dto.productIds,
      user.id,
    );

    return {
      success: true,
      message: `${count} products ${dto.operation.toLowerCase()}d successfully`,
      count,
    };
  }
}
