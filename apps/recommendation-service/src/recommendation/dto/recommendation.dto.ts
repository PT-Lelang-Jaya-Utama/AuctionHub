import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRecommendationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class RecommendedProductDto {
  productId: string;
  category: string;
  title: string;
  score: number;
}

export class SimilarProductDto {
  productId: string;
  category: string;
  title: string;
  similarityScore: number;
}
