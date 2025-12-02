import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const sentinelHosts = configService.get<string>('REDIS_SENTINEL_HOSTS', 'redis-sentinel:26379');
        const masterName = configService.get<string>('REDIS_MASTER_NAME', 'mymaster');
        
        const sentinels = sentinelHosts.split(',').map((host) => {
          const [hostname, port] = host.trim().split(':');
          return { host: hostname, port: parseInt(port, 10) || 26379 };
        });

        return new Redis({
          sentinels,
          name: masterName,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
