import { Module } from '@nestjs/common';
import { ProductClientService } from './product-client.service';
import { BiddingClientService } from './bidding-client.service';

@Module({
  providers: [ProductClientService, BiddingClientService],
  exports: [ProductClientService, BiddingClientService],
})
export class ClientsModule {}
