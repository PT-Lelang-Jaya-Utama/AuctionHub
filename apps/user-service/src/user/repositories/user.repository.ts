import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

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

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email, deletedAt: null })
      .exec();
  }

  async findAll(
    filter: FilterQuery<User> = {},
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<UserDocument>> {
    const query = { ...filter, deletedAt: null };
    
    const total = await this.userModel.countDocuments(query).exec();
    
    let queryBuilder = this.userModel.find(query);
    
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

  async update(
    id: string,
    updateData: UpdateQuery<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  async softDelete(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { deletedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const query: FilterQuery<User> = { email, deletedAt: null };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await this.userModel.countDocuments(query).exec();
    return count > 0;
  }

  async findByRole(
    role: 'buyer' | 'seller',
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<UserDocument>> {
    return this.findAll({ role }, pagination);
  }
}
