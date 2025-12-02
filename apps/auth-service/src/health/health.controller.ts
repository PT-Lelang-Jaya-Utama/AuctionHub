import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import { RedisHealthIndicator } from '@app/health';
import { REDIS_CLIENT } from '../redis';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redisHealth: RedisHealthIndicator,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.redisHealth.isHealthy('redis', this.redis),
    ]);
  }

  @Get('liveness')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('readiness')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.redisHealth.isHealthy('redis', this.redis),
    ]);
  }
}
