import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis';
import { BiddingHealthModule } from './health';
import { ClientsModule } from './clients';
import { BidModule } from './bid';
import { RabbitMQModule } from '@app/rabbitmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    RabbitMQModule.forRootAsync(),
    BiddingHealthModule,
    ClientsModule,
    BidModule,
  ],
  controllers: [],
  providers: [],
})
export class BiddingServiceModule {}
