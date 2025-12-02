import { IsString, IsNumber, IsOptional, IsEnum, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import {
  PaginationDto,
  AuctionStatusType,
  AUCTION_STATUS,
  PRODUCT_CATEGORY_VALUES,
  ProductCategoryType,
} from '@app/shared';

export class ProductFiltersDto extends PaginationDto {
  @IsIn(PRODUCT_CATEGORY_VALUES)
  @IsOptional()
  category?: ProductCategoryType;

  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsEnum(Object.values(AUCTION_STATUS))
  @IsOptional()
  status?: AuctionStatusType;

  @IsEnum(['new', 'used'])
  @IsOptional()
  condition?: 'new' | 'used';

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;
}
