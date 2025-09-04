import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import { CreateProductDto } from '../products/dto/create-product.dto';

@Injectable()
export class CsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async exportProducts(userId: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { userId },
      include: {
        images: true,
        variants: true,
        listings: true,
      },
    });

    const records = products.map(product => ({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice || '',
      quantity: product.quantity,
      sku: product.sku || '',
      brand: product.brand || '',
      condition: product.condition,
      tags: product.tags.join(','),
      status: product.status,
      images: product.images.map(img => img.url).join(','),
      variants: JSON.stringify(product.variants.map(v => ({
        name: v.name,
        value: v.value,
        price: v.price,
        quantity: v.quantity,
      }))),
      listings: product.listings.map(l => `${l.marketplace}:${l.marketplaceId}`).join(','),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }));

    return new Promise((resolve, reject) => {
      stringify(records, {
        header: true,
        columns: [
          'id',
          'title',
          'description',
          'price',
          'originalPrice',
          'quantity',
          'sku',
          'brand',
          'condition',
          'tags',
          'status',
          'images',
          'variants',
          'listings',
          'createdAt',
          'updatedAt',
        ],
      }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  }

  async importProducts(
    file: Express.Multer.File,
    userId: string,
    options: {
      updateExisting?: boolean;
      skipDuplicates?: boolean;
    } = {},
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const records = await this.parseCsv(file.buffer);

    for (const record of records) {
      try {
        // Check if product exists (by SKU or title)
        const existingProduct = record.sku
          ? await this.prisma.product.findFirst({
              where: {
                userId,
                sku: record.sku,
              },
            })
          : await this.prisma.product.findFirst({
              where: {
                userId,
                title: record.title,
              },
            });

        if (existingProduct) {
          if (options.skipDuplicates) {
            results.skipped++;
            continue;
          }

          if (options.updateExisting) {
            // Update existing product
            const updateData = this.mapCsvToProductDto(record);
            await this.productsService.update(
              existingProduct.id,
              updateData,
              userId,
            );
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Create new product
          const createData = this.mapCsvToProductDto(record);
          await this.productsService.create(createData, userId);
          results.imported++;
        }
      } catch (error) {
        results.errors.push(`Row ${records.indexOf(record) + 2}: ${error.message}`);
      }
    }

    return results;
  }

  async generateTemplate(): Promise<string> {
    const template = [
      {
        title: 'Example Product',
        description: 'Product description goes here',
        price: '19.99',
        originalPrice: '29.99',
        quantity: '10',
        sku: 'SKU123',
        brand: 'Brand Name',
        condition: 'new',
        tags: 'tag1,tag2,tag3',
        status: 'ACTIVE',
        images: 'https://example.com/image1.jpg,https://example.com/image2.jpg',
        variants: JSON.stringify([
          { name: 'Size', value: 'Small', price: 19.99, quantity: 5 },
          { name: 'Size', value: 'Large', price: 21.99, quantity: 5 },
        ]),
      },
    ];

    return new Promise((resolve, reject) => {
      stringify(template, {
        header: true,
        columns: [
          'title',
          'description',
          'price',
          'originalPrice',
          'quantity',
          'sku',
          'brand',
          'condition',
          'tags',
          'status',
          'images',
          'variants',
        ],
      }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  }

  private async parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      
      const stream = Readable.from(buffer);
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      stream
        .pipe(parser)
        .on('data', (record) => {
          records.push(record);
        })
        .on('error', (error) => {
          reject(error);
        })
        .on('end', () => {
          resolve(records);
        });
    });
  }

  private mapCsvToProductDto(record: any): CreateProductDto {
    const dto: CreateProductDto = {
      title: record.title,
      description: record.description,
      price: parseFloat(record.price) || 0,
      quantity: parseInt(record.quantity) || 1,
      condition: record.condition || 'new',
      status: record.status || 'DRAFT',
    };

    if (record.originalPrice) {
      dto.originalPrice = parseFloat(record.originalPrice);
    }

    if (record.sku) {
      dto.sku = record.sku;
    }

    if (record.brand) {
      dto.brand = record.brand;
    }

    if (record.tags) {
      dto.tags = record.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    if (record.variants) {
      try {
        dto.variants = JSON.parse(record.variants);
      } catch (error) {
        // Invalid JSON, skip variants
      }
    }

    return dto;
  }

  async bulkOperation(
    operation: 'DELETE' | 'ACTIVATE' | 'ARCHIVE',
    productIds: string[],
    userId: string,
  ): Promise<number> {
    // Verify ownership
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products not found or not owned by user');
    }

    switch (operation) {
      case 'DELETE':
        const result = await this.prisma.product.deleteMany({
          where: {
            id: { in: productIds },
            userId,
          },
        });
        return result.count;

      case 'ACTIVATE':
        const activateResult = await this.prisma.product.updateMany({
          where: {
            id: { in: productIds },
            userId,
          },
          data: { status: 'ACTIVE' },
        });
        return activateResult.count;

      case 'ARCHIVE':
        const archiveResult = await this.prisma.product.updateMany({
          where: {
            id: { in: productIds },
            userId,
          },
          data: { status: 'ARCHIVED' },
        });
        return archiveResult.count;

      default:
        throw new BadRequestException('Invalid operation');
    }
  }
}
