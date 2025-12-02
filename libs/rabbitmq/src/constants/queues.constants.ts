export const QUEUES = {
  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Product Events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_VIEWED: 'product.viewed',
  AUCTION_STARTED: 'auction.started',
  AUCTION_ENDED: 'auction.ended',

  // Bid Events
  BID_PLACED: 'bid.placed',
  BID_OUTBID: 'bid.outbid',
  AUCTION_WINNER: 'auction.winner',
} as const;

export type QueueType = (typeof QUEUES)[keyof typeof QUEUES];

export const QUEUE_CONFIG = {
  durable: true,
  deadLetterExchange: 'dlx',
  messageTtl: 86400000, // 24 hours
} as const;
