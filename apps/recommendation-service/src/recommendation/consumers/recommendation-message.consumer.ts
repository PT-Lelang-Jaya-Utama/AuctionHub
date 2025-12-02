import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
  IMessage,
} from '@app/rabbitmq';
import { RecommendationRepository } from '../repositories';

interface UserCreatedPayload {
  userId: string;
  email: string;
  role: 'buyer' | 'seller';
}

interface ProductCreatedPayload {
  productId: string;
  sellerId: string;
  title: string;
  category: string;
}

interface ProductViewedPayload {
  productId: string;
  userId: string;
  category: string;
  timestamp: number;
}

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
  timestamp?: number;
}

interface AuctionEndedPayload {
  productId: string;
  sellerId: string;
  finalPrice: number;
  winnerId: string | null;
  totalBids: number;
}

@Injectable()
export class RecommendationMessageConsumer implements OnModuleInit {
  private readonly logger = new Logger(RecommendationMessageConsumer.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly repository: RecommendationRepository,
  ) {}

  async onModuleInit() {
    await this.setupConsumers();
  }

  private async setupConsumers(): Promise<void> {
    // Subscribe to user.created events
    await this.rabbitMQService.subscribe(
      EXCHANGES.USER_EVENTS,
      `${QUEUES.USER_CREATED}.recommendation-service`,
      ROUTING_KEYS.USER_CREATED,
      this.handleUserCreated.bind(this),
    );

    // Subscribe to product.created events
    await this.rabbitMQService.subscribe(
      EXCHANGES.PRODUCT_EVENTS,
      `${QUEUES.PRODUCT_CREATED}.recommendation-service`,
      ROUTING_KEYS.PRODUCT_CREATED,
      this.handleProductCreated.bind(this),
    );

    // Subscribe to product.viewed events
    await this.rabbitMQService.subscribe(
      EXCHANGES.PRODUCT_EVENTS,
      `${QUEUES.PRODUCT_VIEWED}.recommendation-service`,
      ROUTING_KEYS.PRODUCT_VIEWED,
      this.handleProductViewed.bind(this),
    );

    // Subscribe to bid.placed events
    await this.rabbitMQService.subscribe(
      EXCHANGES.BID_EVENTS,
      `${QUEUES.BID_PLACED}.recommendation-service`,
      ROUTING_KEYS.BID_PLACED,
      this.handleBidPlaced.bind(this),
    );

    // Subscribe to auction.winner events
    await this.rabbitMQService.subscribe(
      EXCHANGES.BID_EVENTS,
      `${QUEUES.AUCTION_WINNER}.recommendation-service`,
      ROUTING_KEYS.AUCTION_WINNER,
      this.handleAuctionWinner.bind(this),
    );

    // Subscribe to auction.ended events (triggers similarity update)
    await this.rabbitMQService.subscribe(
      EXCHANGES.PRODUCT_EVENTS,
      `${QUEUES.AUCTION_ENDED}.recommendation-service`,
      ROUTING_KEYS.AUCTION_ENDED,
      this.handleAuctionEnded.bind(this),
    );

    this.logger.log('Recommendation message consumers initialized');
  }

  private async handleUserCreated(
    message: IMessage<UserCreatedPayload>,
  ): Promise<void> {
    try {
      const { userId, role } = message.payload;
      this.logger.debug(`Received user.created event for user: ${userId}`);

      await this.repository.createUserNode({ userId, role });

      this.logger.log(`Created User node for: ${userId}`);
    } catch (error) {
      this.logger.error(`Error processing user.created event: ${error}`);
      throw error;
    }
  }

  private async handleProductCreated(
    message: IMessage<ProductCreatedPayload>,
  ): Promise<void> {
    try {
      const { productId, title, category } = message.payload;
      this.logger.debug(
        `Received product.created event for product: ${productId}`,
      );

      await this.repository.createProductNode({ productId, title, category });

      this.logger.log(`Created Product node for: ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing product.created event: ${error}`);
      throw error;
    }
  }

  private async handleProductViewed(
    message: IMessage<ProductViewedPayload>,
  ): Promise<void> {
    try {
      const { productId, userId, timestamp } = message.payload;
      this.logger.debug(
        `Received product.viewed event for product: ${productId} by user: ${userId}`,
      );

      // Ensure user node exists
      await this.repository.createUserNode({ userId, role: 'buyer' });

      // Create VIEWED relationship
      await this.repository.createViewedRelationship(userId, productId, timestamp);

      this.logger.log(`Created VIEWED relationship: ${userId} -> ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing product.viewed event: ${error}`);
      throw error;
    }
  }

  private async handleBidPlaced(
    message: IMessage<BidPlacedPayload>,
  ): Promise<void> {
    try {
      const { productId, userId, amount, timestamp } = message.payload;
      this.logger.debug(
        `Received bid.placed event for product: ${productId} by user: ${userId}`,
      );

      // Ensure user node exists
      await this.repository.createUserNode({ userId, role: 'buyer' });

      // Create BID relationship
      await this.repository.createBidRelationship(
        userId,
        productId,
        amount,
        timestamp,
      );

      this.logger.log(`Created BID relationship: ${userId} -> ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing bid.placed event: ${error}`);
      throw error;
    }
  }

  private async handleAuctionWinner(
    message: IMessage<AuctionWinnerPayload>,
  ): Promise<void> {
    try {
      const { productId, winnerId, timestamp } = message.payload;
      this.logger.debug(
        `Received auction.winner event for product: ${productId}`,
      );

      if (winnerId) {
        await this.repository.createWonRelationship(
          winnerId,
          productId,
          timestamp || Date.now(),
        );
        this.logger.log(
          `Created WON relationship: ${winnerId} -> ${productId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error processing auction.winner event: ${error}`);
      throw error;
    }
  }

  /**
   * Handle auction.ended event - triggers similarity relationship update
   * This replaces the manual /train endpoint with automatic updates
   */
  private async handleAuctionEnded(
    message: IMessage<AuctionEndedPayload>,
  ): Promise<void> {
    try {
      const { productId, totalBids } = message.payload;
      this.logger.debug(
        `Received auction.ended event for product: ${productId}`,
      );

      // Only update similarity if there were bids (meaningful data)
      if (totalBids > 0) {
        const relationshipsCreated = await this.repository.updateSimilarityForProduct(productId);
        this.logger.log(
          `Updated similarity relationships for product: ${productId}, created: ${relationshipsCreated}`,
        );
      } else {
        this.logger.debug(
          `Skipping similarity update for product: ${productId} (no bids)`,
        );
      }
    } catch (error) {
      this.logger.error(`Error processing auction.ended event: ${error}`);
      throw error;
    }
  }
}
