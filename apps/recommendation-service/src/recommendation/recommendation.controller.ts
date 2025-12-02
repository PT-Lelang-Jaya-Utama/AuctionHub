import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import {
  GetRecommendationsQueryDto,
  RecommendedProductDto,
  SimilarProductDto,
} from './dto';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('user/:userId')
  async getUserRecommendations(
    @Param('userId') userId: string,
    @Query() query: GetRecommendationsQueryDto,
  ): Promise<RecommendedProductDto[]> {
    return this.recommendationService.getUserRecommendations(
      userId,
      query.limit,
    );
  }

  @Get('product/:productId/similar')
  async getSimilarProducts(
    @Param('productId') productId: string,
    @Query() query: GetRecommendationsQueryDto,
  ): Promise<SimilarProductDto[]> {
    return this.recommendationService.getSimilarProducts(
      productId,
      query.limit,
    );
  }
}
