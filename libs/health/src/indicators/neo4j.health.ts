import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Driver } from 'neo4j-driver';

@Injectable()
export class Neo4jHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, driver: Driver): Promise<HealthIndicatorResult> {
    try {
      const serverInfo = await driver.getServerInfo();
      const isHealthy = !!serverInfo;

      if (isHealthy) {
        return this.getStatus(key, true, {
          address: serverInfo.address,
          protocolVersion: serverInfo.protocolVersion,
        });
      }

      throw new HealthCheckError(
        'Neo4j health check failed',
        this.getStatus(key, false),
      );
    } catch (error) {
      throw new HealthCheckError(
        'Neo4j health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
