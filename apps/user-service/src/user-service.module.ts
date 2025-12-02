import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@app/rabbitmq';
import { DatabaseModule } from './database';
import { UserModule } from './user';
import { HealthModule } from './health';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RabbitMQModule.forRootAsync(),
    UserModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class UserServiceModule {}
