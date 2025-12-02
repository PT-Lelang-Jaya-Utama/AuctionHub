export const EXCHANGES = {
  USER_EVENTS: 'user.events',
  PRODUCT_EVENTS: 'product.events',
  BID_EVENTS: 'bid.events',
} as const;

export type ExchangeType = (typeof EXCHANGES)[keyof typeof EXCHANGES];

export const EXCHANGE_CONFIG = {
  [EXCHANGES.USER_EVENTS]: {
    type: 'topic',
    durable: true,
  },
  [EXCHANGES.PRODUCT_EVENTS]: {
    type: 'topic',
    durable: true,
  },
  [EXCHANGES.BID_EVENTS]: {
    type: 'topic',
    durable: true,
  },
} as const;
