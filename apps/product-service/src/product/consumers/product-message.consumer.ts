import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService, EXCHANGES, QUEUES, ROUTING_KEYS, IMessage } from '@app/rabbitmq';
import { ProductService } from '../product.service';

interface BidPlacedPayload {
  bidId: string;
  productId: string;
  userId: string;
  amount: number;
  timestamp: number;
}

interface AuctionWinnerPayload {
  productId: string;
  winnerId: string | null;
  winningBid: number;
}

@Injectable()
export class ProductMessageConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProductMessageConsumer.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly productService: ProductService,
  ) {}

  async onModuleInit() {
    await this.setupConsumers();
  }

  private async setupConsumers(): Promise<void> {
    // Subscribe to bid.placed events
    await this.rabbitMQService.subscribe(
      EXCHANGES.BID_EVENTS,
      `${QUEUES.BID_PLACED}.product-service`,
      ROUTING_KEYS.BID_PLACED,
      this.handleBidPlaced.bind(this),
    );

    // Subscribe to auction.winner events
    await this.rabbitMQService.subscribe(
      EXCHANGES.BID_EVENTS,
      `${QUEUES.AUCTION_WINNER}.product-service`,
      ROUTING_KEYS.AUCTION_WINNER,
      this.handleAuctionWinner.bind(this),
    );

    this.logger.log('Product message consumers initialized');
  }

  private async handleBidPlaced(message: IMessage<BidPlacedPayload>): Promise<void> {
    try {
      const { productId, amount } = message.payload;
      this.logger.debug(`Received bid.placed event for product: ${productId}`);
      
      await this.productService.handleBidPlaced(productId, amount);
      
      this.logger.log(`Processed bid.placed event for product: ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing bid.placed event: ${error}`);
      throw error;
    }
  }

  private async handleAuctionWinner(message: IMessage<AuctionWinnerPayload>): Promise<void> {
    try {
      const { productId, winnerId } = message.payload;
      this.logger.debug(`Received auction.winner event for product: ${productId}`);
      
      await this.productService.handleAuctionEnded(productId, winnerId);
      
      this.logger.log(`Processed auction.winner event for product: ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing auction.winner event: ${error}`);
      throw error;
    }
  }
}
