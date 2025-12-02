import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDocument } from './schemas/user.schema';
import { ConflictError, NotFoundError, ForbiddenError } from '@app/shared';
import { RabbitMQService, EXCHANGES, ROUTING_KEYS } from '@app/rabbitmq';
import { ProductClientService, Product } from '../clients/product-client.service';
import { BiddingClientService, Bid } from '../clients/bidding-client.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly productClientService: ProductClientService,
    private readonly biddingClientService: BiddingClientService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDocument> {
    const emailExists = await this.userRepository.existsByEmail(createUserDto.email);
    if (emailExists) {
      throw new ConflictError('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, this.SALT_ROUNDS);

    const userData: Partial<UserDocument> = {
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role,
      profile: createUserDto.profile,
    };

    if (createUserDto.role === 'seller') {
      userData.seller = {
        companyName: '',
        description: '',
        rating: 0,
        totalSales: 0,
      };
    } else {
      userData.buyer = {
        totalBids: 0,
        totalWins: 0,
      };
    }
    

    const user = await this.userRepository.create(userData);
    await this.publishUserCreatedEvent(user);
    this.logger.log(`User created: ${user._id}`);
    return user;
  }

  private async publishUserCreatedEvent(user: UserDocument): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.USER_CREATED,
        {
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          profile: user.profile,
          createdAt: user.createdAt,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to publish user.created event: ${error}`);
    }
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userRepository.findByEmail(email);
  }

  async validateCredentials(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async updateUser(
    id: string,
    updateData: {
      profile?: Partial<UserDocument['profile']>;
      seller?: Partial<UserDocument['seller']>;
      buyer?: Partial<UserDocument['buyer']>;
    },
  ): Promise<UserDocument> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    const updateObj: Record<string, unknown> = {};

    if (updateData.profile) {
      Object.entries(updateData.profile).forEach(([key, value]) => {
        if (value !== undefined) {
          updateObj[`profile.${key}`] = value;
        }
      });
    }

    if (updateData.seller && existingUser.role === 'seller') {
      Object.entries(updateData.seller).forEach(([key, value]) => {
        if (value !== undefined) {
          updateObj[`seller.${key}`] = value;
        }
      });
    }

    if (updateData.buyer && existingUser.role === 'buyer') {
      Object.entries(updateData.buyer).forEach(([key, value]) => {
        if (value !== undefined) {
          updateObj[`buyer.${key}`] = value;
        }
      });
    }

    const user = await this.userRepository.update(id, updateObj);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    await this.publishUserUpdatedEvent(user);
    this.logger.log(`User updated: ${user._id}`);
    return user;
  }

  private async publishUserUpdatedEvent(user: UserDocument): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.USER_UPDATED,
        {
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          profile: user.profile,
          updatedAt: user.updatedAt,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to publish user.updated event: ${error}`);
    }
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.softDelete(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    await this.publishUserDeletedEvent(user);
    this.logger.log(`User soft deleted: ${user._id}`);
  }

  private async publishUserDeletedEvent(user: UserDocument): Promise<void> {
    try {
      await this.rabbitMQService.publish(
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.USER_DELETED,
        {
          userId: user._id.toString(),
          email: user.email,
          deletedAt: user.deletedAt,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to publish user.deleted event: ${error}`);
    }
  }

  async getProfile(id: string): Promise<UserDocument['profile']> {
    const user = await this.findById(id);
    return user.profile;
  }

  async updateProfile(
    id: string,
    profileData: Partial<UserDocument['profile']>,
  ): Promise<UserDocument['profile']> {
    const user = await this.updateUser(id, { profile: profileData });
    return user.profile;
  }

  async getSellerProducts(sellerId: string): Promise<Product[]> {
    const user = await this.findById(sellerId);
    if (user.role !== 'seller') {
      throw new ForbiddenError('User is not a seller');
    }

    return this.productClientService.getSellerProducts(sellerId);
  }

  async getBuyerBids(buyerId: string): Promise<Bid[]> {
    const user = await this.findById(buyerId);
    if (user.role !== 'buyer') {
      throw new ForbiddenError('User is not a buyer');
    }

    return this.biddingClientService.getUserBids(buyerId);
  }
}
