import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService, EXCHANGES, QUEUES, ROUTING_KEYS, IMessage } from '@app/rabbitmq';
import { BidService } from '../bid.service';

interface AuctionStartedPayload {
  productId: string;
  startTime: string;
  endTime: string;
}

interface AuctionEndedPayload {
  productId: string;
}

@Injectable()
export class BidMessageConsumer implements OnModuleInit {
  private readonly logger = new Logger(BidMessageConsumer.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly bidService: BidService,
  ) {}

  async onModuleInit() {
    await this.setupConsumers();
  }

  private async setupConsumers(): Promise<void> {
    // Subscribe to auction.started events
    await this.rabbitMQService.subscribe(
      EXCHANGES.PRODUCT_EVENTS,
      `${QUEUES.AUCTION_STARTED}.bidding-service`,
      ROUTING_KEYS.AUCTION_STARTED,
      this.handleAuctionStarted.bind(this),
    );

    // Subscribe to auction.ended events
    await this.rabbitMQService.subscribe(
      EXCHANGES.PRODUCT_EVENTS,
      `${QUEUES.AUCTION_ENDED}.bidding-service`,
      ROUTING_KEYS.AUCTION_ENDED,
      this.handleAuctionEnded.bind(this),
    );

    this.logger.log('Bid message consumers initialized');
  }

  private async handleAuctionStarted(message: IMessage<AuctionStartedPayload>): Promise<void> {
    try {
      const { productId } = message.payload;
      this.logger.debug(`Received auction.started event for product: ${productId}`);
      
      await this.bidService.initializeAuction(productId);
      
      this.logger.log(`Processed auction.started event for product: ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing auction.started event: ${error}`);
      throw error;
    }
  }

  private async handleAuctionEnded(message: IMessage<AuctionEndedPayload>): Promise<void> {
    try {
      const { productId } = message.payload;
      this.logger.debug(`Received auction.ended event for product: ${productId}`);
      
      await this.bidService.handleAuctionEnded(productId);
      
      this.logger.log(`Processed auction.ended event for product: ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing auction.ended event: ${error}`);
      throw error;
    }
  }
}
