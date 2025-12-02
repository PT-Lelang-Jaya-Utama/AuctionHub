export interface UserNode {
  userId: string;
  role: 'buyer' | 'seller';
}

export interface ProductNode {
  productId: string;
  category: string;
  title: string;
}

export interface CategoryNode {
  name: string;
}

export interface ViewedRelationship {
  viewCount: number;
  firstViewedAt: number;
  lastViewedAt: number;
}

export interface BidRelationship {
  amount: number;
  timestamp: number;
}

export interface WonRelationship {
  timestamp: number;
}

export interface SimilarToRelationship {
  score: number;
  sharedBidders: number;
  sharedViewers: number;
  updatedAt: number;
}

export interface RecommendedProduct {
  productId: string;
  category: string;
  title: string;
  score: number;
}

export interface SimilarProduct {
  productId: string;
  category: string;
  title: string;
  similarityScore: number;
}
