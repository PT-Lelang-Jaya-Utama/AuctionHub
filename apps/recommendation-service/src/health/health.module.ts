import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule as SharedHealthModule } from '@app/health';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, SharedHealthModule],
  controllers: [HealthController],
})
export class HealthModule {}
