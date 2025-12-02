import {
  IsString,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto, UserProfileDto } from './create-user.dto';

export class UpdateUserProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsString()
  @IsOptional()
  avatar?: string;
}

export class UpdateSellerInfoDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalSales?: number;
}

export class UpdateBuyerInfoDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalBids?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalWins?: number;
}

export class UpdateUserDto {
  @ValidateNested()
  @Type(() => UpdateUserProfileDto)
  @IsOptional()
  profile?: UpdateUserProfileDto;

  @ValidateNested()
  @Type(() => UpdateSellerInfoDto)
  @IsOptional()
  seller?: UpdateSellerInfoDto;

  @ValidateNested()
  @Type(() => UpdateBuyerInfoDto)
  @IsOptional()
  buyer?: UpdateBuyerInfoDto;
}
