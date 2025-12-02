export const AUCTION_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export type AuctionStatusType = (typeof AUCTION_STATUS)[keyof typeof AUCTION_STATUS];

// Valid state transitions for auction status
export const AUCTION_TRANSITIONS: Record<AuctionStatusType, AuctionStatusType[]> = {
  [AUCTION_STATUS.DRAFT]: [AUCTION_STATUS.ACTIVE],
  [AUCTION_STATUS.ACTIVE]: [AUCTION_STATUS.ENDED, AUCTION_STATUS.CANCELLED],
  [AUCTION_STATUS.ENDED]: [],
  [AUCTION_STATUS.CANCELLED]: [],
};

export function isValidAuctionTransition(
  currentStatus: AuctionStatusType,
  newStatus: AuctionStatusType,
): boolean {
  return AUCTION_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
