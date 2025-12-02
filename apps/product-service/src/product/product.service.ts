import { Injectable, Logger } from '@nestjs/common';
import { ProductRepository, PaginatedResult, ProductFilters } from './repositories/product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StartAuctionDto } from './dto/start-auction.dto';
import { ProductDocument } from './schemas/product.schema';
import { 
  NotFoundError, 
  BadRequestError, 
  UnprocessableEntityError,
  AUCTION_STATUS,
  isValidAuctionTransition,
  AuctionStatusType,
} from '@app/shared';
import { RabbitMQService, EXCHANGES, ROUTING_KEYS } from '@app/rabbitmq';
import { UserClientService } from '../clients/user-client.service';
import { BiddingClientService } from '../clients/bidding-client.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly userClientService: UserClientService,
    private readonly biddingClientService: BiddingClientService,
  ) {}

  async createProduct(createProductDto: CreateProductDto): Promise<ProductDocument> {
    // Validate seller exists and has seller role
    const isValidSeller = await this.userClientService.validateSeller(createProductDto.sellerId);
    if (!isValidSeller) {
      throw new BadRequestError('Invalid seller ID or user is not a seller');
    }

    // Create product with initial auction status as draft
    const productData: Partial<ProductDocument> = {
      ...createProductDto,
      currentPrice: createProductDto.startingPrice,
      images: createProductDto.images || [],
      specifications: createProductDto.specifications || {},
      auction: {
        status: AUCTION_STATUS.DRAFT,
        totalBids: 0,
      },
    };

    const product = await this.productRepository.create(productData);

    // Publish product.created event
    await this.publishProductCreatedEvent(product);

    this.logger.log(`Product created: ${product._id}`);
    return product;
  }

  private async publishProductCreatedEvent(product: ProductDocument): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.PRODUCT_EVENTS,
        ROUTING_KEYS.PRODUCT_CREATED,
        {
          productId: product._id.toString(),
          sellerId: product.sellerId,
          title: product.title,
          category: product.category,
          startingPrice: product.startingPrice,
          createdAt: product.createdAt,
        },
      );
      this.logger.debug(`Published product.created event for product: ${product._id}`);
    } catch (error) {
      this.logger.error(`Failed to publish product.created event: ${error}`);
    }
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    return product;
  }

  async findAll(
    filters: ProductFilters,
    pagination?: { page: number; limit: number },
  ): Promise<PaginatedResult<ProductDocument>> {
    return this.productRepository.findAll(filters, pagination);
  }

  async findBySellerId(
    sellerId: string,
    pagination?: { page: number; limit: number },
  ): Promise<PaginatedResult<ProductDocument>> {
    return this.productRepository.findBySellerId(sellerId, pagination);
  }

  async findByCategory(
    category: string,
    pagination?: { page: number; limit: number },
  ): Promise<PaginatedResult<ProductDocument>> {
    return this.productRepository.findByCategory(category, pagination);
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto): Promise<ProductDocument> {
    // First check if product exists
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new NotFoundError('Product', id);
    }

    // Only allow updates if status is draft
    if (existingProduct.auction.status !== AUCTION_STATUS.DRAFT) {
      throw new UnprocessableEntityError('Cannot update product after auction has started');
    }

    // If startingPrice is updated, also update currentPrice
    const updateData: Record<string, unknown> = { ...updateProductDto };
    if (updateProductDto.startingPrice !== undefined) {
      updateData.currentPrice = updateProductDto.startingPrice;
    }

    const product = await this.productRepository.update(id, updateData);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    // Publish product.updated event
    await this.publishProductUpdatedEvent(product);

    this.logger.log(`Product updated: ${product._id}`);
    return product;
  }

  private async publishProductUpdatedEvent(product: ProductDocument): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.PRODUCT_EVENTS,
        ROUTING_KEYS.PRODUCT_UPDATED,
        {
          productId: product._id.toString(),
          sellerId: product.sellerId,
          title: product.title,
          category: product.category,
          updatedAt: product.updatedAt,
        },
      );
      this.logger.debug(`Published product.updated event for product: ${product._id}`);
    } catch (error) {
      this.logger.error(`Failed to publish product.updated event: ${error}`);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.productRepository.softDelete(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    // Publish product.deleted event
    await this.publishProductDeletedEvent(product);

    this.logger.log(`Product soft deleted: ${product._id}`);
  }

  private async publishProductDeletedEvent(product: ProductDocument): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.PRODUCT_EVENTS,
        ROUTING_KEYS.PRODUCT_DELETED,
        {
          productId: product._id.toString(),
          sellerId: product.sellerId,
          deletedAt: product.deletedAt,
        },
      );
      this.logger.debug(`Published product.deleted event for product: ${product._id}`);
    } catch (error) {
      this.logger.error(`Failed to publish product.deleted event: ${error}`);
    }
  }

  async getAuctionStatus(id: string): Promise<ProductDocument['auction']> {
    const product = await this.findById(id);
    return product.auction;
  }

  async startAuction(id: string, startAuctionDto: StartAuctionDto): Promise<ProductDocument> {
    const product = await this.findById(id);

    // Validate state transition
    if (!isValidAuctionTransition(product.auction.status, AUCTION_STATUS.ACTIVE)) {
      throw new UnprocessableEntityError(
        `Cannot start auction from status '${product.auction.status}'`,
      );
    }

    const startTime = new Date(startAuctionDto.startTime);
    const endTime = new Date(startAuctionDto.endTime);

    // Validate times
    if (endTime <= startTime) {
      throw new BadRequestError('End time must be after start time');
    }

    const updatedProduct = await this.productRepository.updateAuctionStatus(
      id,
      AUCTION_STATUS.ACTIVE,
      { startTime, endTime },
    );

    if (!updatedProduct) {
      throw new NotFoundError('Product', id);
    }

    // Publish auction.started event
    await this.publishAuctionStartedEvent(updatedProduct);

    this.logger.log(`Auction started for product: ${updatedProduct._id}`);
    return updatedProduct;
  }

  private async publishAuctionStartedEvent(product: ProductDocument): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.PRODUCT_EVENTS,
        ROUTING_KEYS.AUCTION_STARTED,
        {
          productId: product._id.toString(),
          sellerId: product.sellerId,
          startingPrice: product.startingPrice,
          startTime: product.auction.startTime,
          endTime: product.auction.endTime,
        },
      );
      this.logger.debug(`Published auction.started event for product: ${product._id}`);
    } catch (error) {
      this.logger.error(`Failed to publish auction.started event: ${error}`);
    }
  }

  async endAuction(id: string): Promise<ProductDocument> {
    const product = await this.findById(id);

    // Validate state transition
    if (!isValidAuctionTransition(product.auction.status, AUCTION_STATUS.ENDED)) {
      throw new UnprocessableEntityError(
        `Cannot end auction from status '${product.auction.status}'`,
      );
    }

    // Get winner from Bidding Service
    const winner = await this.biddingClientService.getWinner(id);

    let updatedProduct: ProductDocument | null;
    if (winner) {
      updatedProduct = await this.productRepository.setWinner(id, winner.userId);
    } else {
      updatedProduct = await this.productRepository.updateAuctionStatus(
        id,
        AUCTION_STATUS.ENDED,
      );
    }

    if (!updatedProduct) {
      throw new NotFoundError('Product', id);
    }

    // Publish auction.ended event
    await this.publishAuctionEndedEvent(updatedProduct, winner?.userId);

    this.logger.log(`Auction ended for product: ${updatedProduct._id}`);
    return updatedProduct;
  }

  private async publishAuctionEndedEvent(product: ProductDocument, winnerId?: string): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.PRODUCT_EVENTS,
        ROUTING_KEYS.AUCTION_ENDED,
        {
          productId: product._id.toString(),
          sellerId: product.sellerId,
          finalPrice: product.currentPrice,
          winnerId: winnerId || null,
          totalBids: product.auction.totalBids,
        },
      );
      this.logger.debug(`Published auction.ended event for product: ${product._id}`);
    } catch (error) {
      this.logger.error(`Failed to publish auction.ended event: ${error}`);
    }
  }

  // Called by RabbitMQ consumer when bid.placed event is received
  async handleBidPlaced(productId: string, amount: number): Promise<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      this.logger.warn(`Product not found for bid update: ${productId}`);
      return;
    }

    await this.productRepository.updateBidInfo(
      productId,
      amount,
      product.auction.totalBids + 1,
    );

    this.logger.debug(`Updated bid info for product: ${productId}`);
  }

  // Called by RabbitMQ consumer when auction.ended event is received (from Bidding Service)
  async handleAuctionEnded(productId: string, winnerId: string | null): Promise<void> {
    if (winnerId) {
      await this.productRepository.setWinner(productId, winnerId);
    } else {
      await this.productRepository.updateAuctionStatus(productId, AUCTION_STATUS.ENDED);
    }

    this.logger.debug(`Updated auction status for product: ${productId}`);
  }
}
