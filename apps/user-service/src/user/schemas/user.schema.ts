import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  province: string;

  @Prop({ required: true })
  postalCode: string;
}

@Schema({ _id: false })
export class UserProfile {
  @Prop({ required: true })
  name: string;

  @Prop()
  phone?: string;

  @Prop({ type: Address })
  address?: Address;

  @Prop()
  avatar?: string;
}

@Schema({ _id: false })
export class SellerInfo {
  @Prop()
  companyName: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  totalSales: number;
}

@Schema({ _id: false })
export class BuyerInfo {
  @Prop({ default: 0 })
  totalBids: number;

  @Prop({ default: 0 })
  totalWins: number;
}


@Schema({
  timestamps: true,
  collection: 'users',
})
export class User extends Document {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['buyer', 'seller'] })
  role: 'buyer' | 'seller';

  @Prop({ type: UserProfile, required: true })
  profile: UserProfile;

  @Prop({ type: SellerInfo })
  seller: SellerInfo;

  @Prop({ type: BuyerInfo })
  buyer: BuyerInfo;

  @Prop()
  deletedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add index for soft delete queries
UserSchema.index({ deletedAt: 1 });

// Add compound index for role-based queries
UserSchema.index({ role: 1, deletedAt: 1 });
