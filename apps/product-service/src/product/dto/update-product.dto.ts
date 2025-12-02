import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  IsObject,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

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
