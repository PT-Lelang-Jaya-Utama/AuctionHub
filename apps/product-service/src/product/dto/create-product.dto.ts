import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  IsObject,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateProductDto {
  // sellerId is extracted from JWT token, not from request body

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

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
