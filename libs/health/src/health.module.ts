import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { MongoDBHealthIndicator } from './indicators/mongodb.health';
import { Neo4jHealthIndicator } from './indicators/neo4j.health';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    MongoDBHealthIndicator,
    Neo4jHealthIndicator,
    RabbitMQHealthIndicator,
  ],
  exports: [
    RedisHealthIndicator,
    MongoDBHealthIndicator,
    Neo4jHealthIndicator,
    RabbitMQHealthIndicator,
  ],
})
export class HealthModule {}
