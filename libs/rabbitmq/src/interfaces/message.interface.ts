export interface IMessage<T = unknown> {
  id: string;
  type: string;
  timestamp: number;
  payload: T;
  metadata?: Record<string, unknown>;
}

export interface IUserCreatedPayload {
  userId: string;
  email: string;
  role: 'buyer' | 'seller';
}

export interface IUserUpdatedPayload {
  userId: string;
  changes: Record<string, unknown>;
}

export interface IUserDeletedPayload {
  userId: string;
}

export interface IProductCreatedPayload {
  productId: string;
  sellerId: string;
  title: string;
  category: string;
}

export interface IProductUpdatedPayload {
  productId: string;
  changes: Record<string, unknown>;
}

export interface IProductDeletedPayload {
  productId: string;
}

export interface IAuctionStartedPayload {
  productId: string;
  startTime: number;
  endTime: number;
  startingPrice: number;
}

export interface IAuctionEndedPayload {
  productId: string;
  endTime: number;
  finalPrice: number;
  totalBids: number;
}

export interface IBidPlacedPayload {
  bidId: string;
  productId: string;
  userId: string;
  amount: number;
  timestamp: number;
}

export interface IBidOutbidPayload {
  bidId: string;
  productId: string;
  userId: string;
  newHighestBid: number;
}

export interface IAuctionWinnerPayload {
  productId: string;
  winnerId: string;
  winningBid: number;
}
