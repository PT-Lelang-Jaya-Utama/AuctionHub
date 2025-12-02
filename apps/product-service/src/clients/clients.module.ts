import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserClientService } from './user-client.service';
import { BiddingClientService } from './bidding-client.service';

@Module({
  imports: [ConfigModule],
  providers: [UserClientService, BiddingClientService],
  exports: [UserClientService, BiddingClientService],
})
export class ClientsModule {}
