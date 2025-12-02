import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '@app/shared';
import { AuctionStatusType, AUCTION_STATUS } from '@app/shared';

export class ProductFiltersDto extends PaginationDto {
  @IsString()
  @IsOptional()
  category?: string;

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
