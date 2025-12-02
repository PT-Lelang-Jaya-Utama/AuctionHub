export type BidStatus = 'active' | 'outbid' | 'winner';

export interface IBid {
  bidId: string;
  productId: string;
  userId: string;
  amount: number;
  timestamp: number;
  status: BidStatus;
}

export interface IBidSortedSetMember {
  score: number;
  member: string; // format: {userId}:{amount}:{timestamp}
}
