import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Product, ProductImage, Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto, userId: string, files?: Express.Multer.File[]): Promise<Product> {
    const { images, variants, ...productData } = createProductDto;
    
    // Process uploaded files
    const imageData: Prisma.ProductImageCreateManyProductInput[] = [];
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(process.env.UPLOAD_DESTINATION || './uploads', fileName);
        
        // Save file to disk (in production, upload to S3/Cloudinary)
        await fs.writeFile(filePath, file.buffer);
        
        imageData.push({
          url: `/uploads/${fileName}`,
          path: filePath,
          order: i,
        });
      }
    }

    // Create product with images and variants
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        userId,
        images: {
          create: imageData,
        },
        variants: variants ? {
          create: variants,
        } : undefined,
      },
      include: {
        images: true,
        variants: true,
        listings: true,
        categories: true,
      },
    });

    return product;
  }

  async findAll(userId: string, filters?: {
    status?: string;
    search?: string;
    marketplace?: string;
  }): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = { userId };

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.marketplace) {
      where.listings = {
        some: {
          marketplace: filters.marketplace as any,
        },
      };
    }

    return this.prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        variants: true,
        listings: {
          select: {
            marketplace: true,
            status: true,
            marketplaceId: true,
            marketplaceUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        variants: true,
        listings: true,
        categories: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    files?: Express.Multer.File[]
  ): Promise<Product> {
    // Verify product ownership
    const existingProduct = await this.findOne(id, userId);

    const { images, variants, ...productData } = updateProductDto;

    // Process new uploaded files
    const imageData: Prisma.ProductImageCreateManyProductInput[] = [];
    if (files && files.length > 0) {
      // Delete existing images
      await this.prisma.productImage.deleteMany({
        where: { productId: id },
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(process.env.UPLOAD_DESTINATION || './uploads', fileName);
        
        await fs.writeFile(filePath, file.buffer);
        
        imageData.push({
          url: `/uploads/${fileName}`,
          path: filePath,
          order: i,
        });
      }
    }

    // Update product
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        images: imageData.length > 0 ? {
          create: imageData,
        } : undefined,
        variants: variants ? {
          deleteMany: {},
          create: variants,
        } : undefined,
      },
      include: {
        images: true,
        variants: true,
        listings: true,
        categories: true,
      },
    });

    return product;
  }

  async remove(id: string, userId: string): Promise<void> {
    // Verify product ownership
    await this.findOne(id, userId);

    // Delete product and all related data (cascade)
    await this.prisma.product.delete({
      where: { id },
    });
  }

  async updateInventory(id: string, quantity: number, userId: string): Promise<Product> {
    const product = await this.findOne(id, userId);

    return this.prisma.product.update({
      where: { id },
      data: { quantity },
      include: {
        images: true,
        variants: true,
        listings: true,
      },
    });
  }

  async bulkUpdate(
    productIds: string[],
    updateData: Partial<UpdateProductDto>,
    userId: string
  ): Promise<number> {
    // Verify ownership of all products
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products not found or not owned by user');
    }

    const result = await this.prisma.product.updateMany({
      where: {
        id: { in: productIds },
        userId,
      },
      data: updateData,
    });

    return result.count;
  }

  async getProductStats(userId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    sold: number;
  }> {
    const [total, active, draft, sold] = await Promise.all([
      this.prisma.product.count({ where: { userId } }),
      this.prisma.product.count({ where: { userId, status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { userId, status: 'DRAFT' } }),
      this.prisma.product.count({ where: { userId, status: 'SOLD' } }),
    ]);

    return { total, active, draft, sold };
  }

  async duplicateProduct(id: string, userId: string): Promise<Product> {
    const original = await this.findOne(id, userId);
    
    // Extract related data for duplication
    const originalImages = (original as any).images || [];
    const originalVariants = (original as any).variants || [];

    // Create base product data without relations
    const { id: _, createdAt, updatedAt, ...productData } = original;

    return this.prisma.product.create({
      data: {
        ...productData,
        title: `${productData.title} (Copy)`,
        status: 'DRAFT' as any,
        images: originalImages.length > 0 ? {
          create: originalImages.map((img: any) => {
            const { id, productId, createdAt, updatedAt, ...imgData } = img;
            return imgData;
          }),
        } : undefined,
        variants: originalVariants.length > 0 ? {
          create: originalVariants.map((variant: any) => {
            const { id, productId, createdAt, updatedAt, ...variantData } = variant;
            return variantData;
          }),
        } : undefined,
      },
      include: {
        images: true,
        variants: true,
      },
    });
  }
}
