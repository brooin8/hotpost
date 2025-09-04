import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  create(
    @Body() createProductDto: CreateProductDto,
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.productsService.create(createProductDto, req.user.id, files);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products for user' })
  findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('marketplace') marketplace?: string,
  ) {
    return this.productsService.findAll(req.user.id, {
      status,
      search,
      marketplace,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get product statistics' })
  getStats(@Request() req) {
    return this.productsService.getProductStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.productsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.productsService.update(id, updateProductDto, req.user.id, files);
  }

  @Patch(':id/inventory')
  @ApiOperation({ summary: 'Update product inventory' })
  updateInventory(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Request() req,
  ) {
    return this.productsService.updateInventory(id, quantity, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  remove(@Param('id') id: string, @Request() req) {
    return this.productsService.remove(id, req.user.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a product' })
  duplicate(@Param('id') id: string, @Request() req) {
    return this.productsService.duplicateProduct(id, req.user.id);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update products' })
  bulkUpdate(
    @Body('productIds') productIds: string[],
    @Body('updateData') updateData: Partial<UpdateProductDto>,
    @Request() req,
  ) {
    return this.productsService.bulkUpdate(productIds, updateData, req.user.id);
  }
}
