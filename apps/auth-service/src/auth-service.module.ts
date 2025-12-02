import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis';
import { JwtConfigModule } from './jwt';
import { AuthModule } from './auth';
import { AuthHealthModule } from './health';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    JwtConfigModule,
    AuthModule,
    AuthHealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AuthServiceModule {}
