import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  Min,
  IsIn,
} from 'class-validator';
import { PRODUCT_CATEGORY_VALUES, ProductCategoryType } from '@app/shared';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(PRODUCT_CATEGORY_VALUES, {
    message: `category must be one of: ${PRODUCT_CATEGORY_VALUES.join(', ')}`,
  })
  @IsOptional()
  category?: ProductCategoryType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  startingPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  buyNowPrice?: number;

  @IsEnum(['new', 'used'])
  @IsOptional()
  condition?: 'new' | 'used';

  @IsObject()
  @IsOptional()
  specifications?: Record<string, unknown>;
}
