import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  originalPrice?: number;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ default: 'new' })
  @IsString()
  condition: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED'], default: 'DRAFT' })
  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED'])
  status?: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED';

  @ApiProperty({ type: [CreateVariantDto], required: false })
  @IsOptional()
  @IsArray()
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  // Images will be handled separately through file upload
  images?: any[];
}
