export type AuctionStatus = 'draft' | 'active' | 'ended' | 'cancelled';
export type ProductCondition = 'new' | 'used';

export interface IAuction {
  status: AuctionStatus;
  startTime?: Date;
  endTime?: Date;
  winnerId?: string;
  totalBids: number;
}

export interface IProduct {
  _id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  startingPrice: number;
  currentPrice: number;
  buyNowPrice?: number;
  condition: ProductCondition;
  specifications: Record<string, unknown>;
  auction: IAuction;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
