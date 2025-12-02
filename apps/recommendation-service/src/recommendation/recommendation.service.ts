import { Injectable, Logger } from '@nestjs/common';
import { RecommendationRepository } from './repositories';
import { RecommendedProductDto, SimilarProductDto } from './dto';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(private readonly repository: RecommendationRepository) {}

  async getUserRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<RecommendedProductDto[]> {
    this.logger.debug(`Getting recommendations for user: ${userId}`);
    return this.repository.getUserRecommendations(userId, limit);
  }

  async getSimilarProducts(
    productId: string,
    limit: number = 10,
  ): Promise<SimilarProductDto[]> {
    this.logger.debug(`Getting similar products for: ${productId}`);
    return this.repository.getSimilarProducts(productId, limit);
  }
}
