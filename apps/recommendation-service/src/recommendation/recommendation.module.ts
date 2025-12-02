import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { RecommendationRepository } from './repositories';
import { RecommendationMessageConsumer } from './consumers';

@Module({
  controllers: [RecommendationController],
  providers: [
    RecommendationService,
    RecommendationRepository,
    RecommendationMessageConsumer,
  ],
  exports: [RecommendationService, RecommendationRepository],
})
export class RecommendationModule {}
