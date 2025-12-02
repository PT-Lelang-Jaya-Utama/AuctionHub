import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { AuctionStatusType } from '@app/shared';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductFilters {
  category?: string;
  sellerId?: string;
  status?: AuctionStatusType;
  condition?: 'new' | 'used';
  minPrice?: number;
  maxPrice?: number;
}

@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(productData: Partial<Product>): Promise<ProductDocument> {
    const product = new this.productModel(productData);
    return product.save();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
  }

  async findAll(
    filters: ProductFilters = {},
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ProductDocument>> {
    const query: FilterQuery<Product> = { deletedAt: null };

    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.sellerId) {
      query.sellerId = filters.sellerId;
    }
    if (filters.status) {
      query['auction.status'] = filters.status;
    }
    if (filters.condition) {
      query.condition = filters.condition;
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.currentPrice = {};
      if (filters.minPrice !== undefined) {
        query.currentPrice.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        query.currentPrice.$lte = filters.maxPrice;
      }
    }

    const total = await this.productModel.countDocuments(query).exec();

    let queryBuilder = this.productModel.find(query).sort({ createdAt: -1 });

    if (pagination) {
      const skip = (pagination.page - 1) * pagination.limit;
      queryBuilder = queryBuilder.skip(skip).limit(pagination.limit);
    }

    const data = await queryBuilder.exec();

    return {
      data,
      total,
      page: pagination?.page || 1,
      limit: pagination?.limit || total,
    };
  }

  async findBySellerId(
    sellerId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ProductDocument>> {
    return this.findAll({ sellerId }, pagination);
  }

  async findByCategory(
    category: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ProductDocument>> {
    return this.findAll({ category }, pagination);
  }

  async update(
    id: string,
    updateData: UpdateQuery<Product>,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  async softDelete(id: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { deletedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  async updateAuctionStatus(
    id: string,
    status: AuctionStatusType,
    additionalFields?: Partial<Product['auction']>,
  ): Promise<ProductDocument | null> {
    const updateData: Record<string, unknown> = {
      'auction.status': status,
    };

    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[`auction.${key}`] = value;
        }
      });
    }

    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  async updateBidInfo(
    id: string,
    currentPrice: number,
    totalBids: number,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { 
          $set: { 
            currentPrice,
            'auction.totalBids': totalBids,
          } 
        },
        { new: true },
      )
      .exec();
  }

  async setWinner(
    id: string,
    winnerId: string,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { 
          $set: { 
            'auction.winnerId': winnerId,
            'auction.status': 'ended',
          } 
        },
        { new: true },
      )
      .exec();
  }
}
