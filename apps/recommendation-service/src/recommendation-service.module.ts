import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@app/rabbitmq';
import { Neo4jModule } from './neo4j';
import { HealthModule } from './health';
import { RecommendationModule } from './recommendation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    Neo4jModule,
    RabbitMQModule.forRootAsync(),
    HealthModule,
    RecommendationModule,
  ],
  controllers: [],
  providers: [],
})
export class RecommendationServiceModule {}
