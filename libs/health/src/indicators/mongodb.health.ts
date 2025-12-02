import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Connection } from 'mongoose';

@Injectable()
export class MongoDBHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, connection: Connection): Promise<HealthIndicatorResult> {
    try {
      const isConnected = connection.readyState === 1;

      if (isConnected) {
        return this.getStatus(key, true);
      }

      throw new HealthCheckError(
        'MongoDB health check failed',
        this.getStatus(key, false, { readyState: connection.readyState }),
      );
    } catch (error) {
      throw new HealthCheckError(
        'MongoDB health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
