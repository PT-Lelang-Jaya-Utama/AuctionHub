import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, client: Redis): Promise<HealthIndicatorResult> {
    try {
      const result = await client.ping();
      const isHealthy = result === 'PONG';

      if (isHealthy) {
        return this.getStatus(key, true);
      }

      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false),
      );
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
