import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import {
  GetRecommendationsQueryDto,
  RecommendedProductDto,
  SimilarProductDto,
} from './dto';
import { JwtAuthGuard, CurrentUser, CurrentUserData } from '@app/shared';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserRecommendations(
    @CurrentUser() user: CurrentUserData,
    @Query() query: GetRecommendationsQueryDto,
  ): Promise<RecommendedProductDto[]> {
    return this.recommendationService.getUserRecommendations(
      user.userId,
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
