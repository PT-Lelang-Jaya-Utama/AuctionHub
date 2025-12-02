import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  Min,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { PRODUCT_CATEGORY_VALUES, ProductCategoryType } from '@app/shared';

export class CreateProductDto {
  // sellerId is extracted from JWT token, not from request body

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsIn(PRODUCT_CATEGORY_VALUES, {
    message: `category must be one of: ${PRODUCT_CATEGORY_VALUES.join(', ')}`,
  })
  category: ProductCategoryType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsNumber()
  @Min(0)
  startingPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  buyNowPrice?: number;

  @IsEnum(['new', 'used'])
  condition: 'new' | 'used';

  @IsObject()
  @IsOptional()
  specifications?: Record<string, unknown>;
}
