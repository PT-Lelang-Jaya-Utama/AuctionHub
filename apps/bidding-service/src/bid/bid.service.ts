import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IBid } from '@app/shared';
import { RabbitMQService, EXCHANGES, ROUTING_KEYS } from '@app/rabbitmq';
import { BidRepository } from './repositories/bid.repository';
import { ProductClientService } from '../clients/product-client.service';
import { CreateBidDto } from './dto/create-bid.dto';

@Injectable()
export class BidService {
  private readonly logger = new Logger(BidService.name);

  constructor(
    private readonly bidRepository: BidRepository,
    private readonly productClient: ProductClientService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Place a new bid
   * - Validates auction is active
   * - Validates bid > currentPrice
   * - Validates user != seller
   * - Stores bid
   * - Updates previous bids to outbid
   * - Publishes bid.placed event
   */
  async placeBid(createBidDto: CreateBidDto & { userId: string }): Promise<IBid> {
    const { productId, userId, amount } = createBidDto;

    // Validate auction is active and get product details
    const { active, product } = await this.productClient.isAuctionActive(productId);

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    if (!active) {
      throw new BadRequestException(`Auction for product ${productId} is not active`);
    }

    // Validate user is not the seller
    if (product.sellerId === userId) {
      throw new ForbiddenException('Seller cannot bid on their own product');
    }

    // Validate bid amount is greater than current price
    const currentPrice = product.currentPrice || product.startingPrice;
    if (amount <= currentPrice) {
      throw new BadRequestException(
        `Bid amount (${amount}) must be greater than current price (${currentPrice})`,
      );
    }

    // Check if there's a higher existing bid
    const highestBid = await this.bidRepository.getHighestBid(productId);
    if (highestBid && amount <= highestBid.amount) {
      throw new BadRequestException(
        `Bid amount (${amount}) must be greater than highest bid (${highestBid.amount})`,
      );
    }

    // Place the bid
    const bid = await this.bidRepository.placeBid(productId, userId, amount);

    // Mark other bids as outbid
    await this.bidRepository.markOtherBidsAsOutbid(productId, bid.bidId);

    // Publish bid.placed event
    await this.publishBidPlaced(bid);

    // Publish bid.outbid events for previous highest bidder
    if (highestBid && highestBid.userId !== userId) {
      await this.publishBidOutbid(highestBid, bid);
    }

    this.logger.log(`Bid placed: ${bid.bidId} for product ${productId} by user ${userId}`);

    return bid;
  }

  /**
   * Get all bids for a product
   */
  async getProductBids(productId: string): Promise<IBid[]> {
    return this.bidRepository.getProductBidsWithDetails(productId);
  }

  /**
   * Get highest bid for a product
   */
  async getHighestBid(productId: string): Promise<IBid | null> {
    return this.bidRepository.getHighestBid(productId);
  }

  /**
   * Get all bids by a user
   */
  async getUserBids(userId: string): Promise<IBid[]> {
    return this.bidRepository.getUserBids(userId);
  }

  /**
   * Get winner for an ended auction
   */
  async getWinner(productId: string): Promise<IBid | null> {
    // Verify auction has ended
    const { product } = await this.productClient.isAuctionActive(productId);
    
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    if (product.auction.status !== 'ended') {
      throw new BadRequestException('Auction has not ended yet');
    }

    return this.bidRepository.getWinner(productId);
  }

  /**
   * Initialize bids for a product when auction starts
   */
  async initializeAuction(productId: string): Promise<void> {
    await this.bidRepository.initializeProductBids(productId);
    this.logger.log(`Initialized bids for product ${productId}`);
  }

  /**
   * Handle auction ended - determine winner and publish event
   */
  async handleAuctionEnded(productId: string): Promise<void> {
    const winner = await this.bidRepository.getWinner(productId);
    
    // Set TTL on bid data
    await this.bidRepository.setAuctionEndedTTL(productId);

    // Publish auction.winner event
    await this.publishAuctionWinner(productId, winner);

    this.logger.log(`Auction ended for product ${productId}, winner: ${winner?.userId || 'none'}`);
  }

  /**
   * Publish bid.placed event
   */
  private async publishBidPlaced(bid: IBid): Promise<void> {
    await this.rabbitMQService.publish(
      EXCHANGES.BID_EVENTS,
      ROUTING_KEYS.BID_PLACED,
      {
        bidId: bid.bidId,
        productId: bid.productId,
        userId: bid.userId,
        amount: bid.amount,
        timestamp: bid.timestamp,
      },
    );
  }

  /**
   * Publish bid.outbid event
   */
  private async publishBidOutbid(outbidBid: IBid, newBid: IBid): Promise<void> {
    await this.rabbitMQService.publish(
      EXCHANGES.BID_EVENTS,
      ROUTING_KEYS.BID_OUTBID,
      {
        outbidBidId: outbidBid.bidId,
        outbidUserId: outbidBid.userId,
        outbidAmount: outbidBid.amount,
        newBidId: newBid.bidId,
        newUserId: newBid.userId,
        newAmount: newBid.amount,
        productId: newBid.productId,
      },
    );
  }

  /**
   * Publish auction.winner event
   */
  private async publishAuctionWinner(productId: string, winner: IBid | null): Promise<void> {
    await this.rabbitMQService.publish(
      EXCHANGES.BID_EVENTS,
      ROUTING_KEYS.AUCTION_WINNER,
      {
        productId,
        winnerId: winner?.userId || null,
        winningBid: winner?.amount || 0,
        bidId: winner?.bidId || null,
      },
    );
  }
}
