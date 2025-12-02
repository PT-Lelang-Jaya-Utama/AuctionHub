import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Driver } from 'neo4j-driver';
import { Neo4jHealthIndicator } from '@app/health';
import { NEO4J_DRIVER } from '../neo4j';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private neo4jHealth: Neo4jHealthIndicator,
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.neo4jHealth.isHealthy('neo4j', this.driver),
    ]);
  }

  @Get('liveness')
  liveness() {
    return { status: 'ok' };
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.neo4jHealth.isHealthy('neo4j', this.driver),
    ]);
  }
}
