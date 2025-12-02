import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@app/rabbitmq';
import { DatabaseModule } from './database';
import { HealthModule } from './health';
import { ProductModule } from './product';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RabbitMQModule.forRootAsync(),
    HealthModule,
    ProductModule,
  ],
  controllers: [],
  providers: [],
})
export class ProductServiceModule {}
