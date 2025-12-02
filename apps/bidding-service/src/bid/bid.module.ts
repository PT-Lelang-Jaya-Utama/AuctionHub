import { Module } from '@nestjs/common';
import { BidController } from './bid.controller';
import { BidService } from './bid.service';
import { BidRepository } from './repositories/bid.repository';
import { BidMessageConsumer } from './consumers/bid-message.consumer';
import { ClientsModule } from '../clients';

@Module({
  imports: [ClientsModule],
  controllers: [BidController],
  providers: [BidService, BidRepository, BidMessageConsumer],
  exports: [BidService],
})
export class BidModule {}
