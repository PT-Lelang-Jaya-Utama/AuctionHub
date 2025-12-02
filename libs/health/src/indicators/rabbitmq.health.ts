import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Channel } from 'amqplib';

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, channel: Channel | null): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = channel !== null;

      if (isHealthy) {
        return this.getStatus(key, true);
      }

      throw new HealthCheckError(
        'RabbitMQ health check failed',
        this.getStatus(key, false),
      );
    } catch (error) {
      throw new HealthCheckError(
        'RabbitMQ health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
