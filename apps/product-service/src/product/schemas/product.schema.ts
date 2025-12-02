import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { AuctionStatusType, AUCTION_STATUS } from '@app/shared';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
export class Auction {
  @Prop({ 
    required: true, 
    enum: Object.values(AUCTION_STATUS),
    default: AUCTION_STATUS.DRAFT,
  })
  status: AuctionStatusType;

  @Prop()
  startTime?: Date;

  @Prop()
  endTime?: Date;

  @Prop()
  winnerId?: string;

  @Prop({ default: 0 })
  totalBids: number;
}

@Schema({
  timestamps: true,
  collection: 'products',
})
export class Product extends Document {
  @Prop({ required: true, index: true })
  sellerId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ required: true, min: 0 })
  startingPrice: number;

  @Prop({ required: true, min: 0 })
  currentPrice: number;

  @Prop({ min: 0 })
  buyNowPrice?: number;

  @Prop({ required: true, enum: ['new', 'used'] })
  condition: 'new' | 'used';

  @Prop({ type: Object, default: {} })
  specifications: Record<string, unknown>;

  @Prop({ type: Auction, required: true })
  auction: Auction;

  @Prop()
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Add index for soft delete queries
ProductSchema.index({ deletedAt: 1 });

// Add compound index for seller queries
ProductSchema.index({ sellerId: 1, deletedAt: 1 });

// Add compound index for category queries
ProductSchema.index({ category: 1, deletedAt: 1 });

// Add compound index for auction status queries
ProductSchema.index({ 'auction.status': 1, deletedAt: 1 });
