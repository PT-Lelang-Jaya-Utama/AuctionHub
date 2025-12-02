import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { IBid, BidStatus } from '@app/shared';
import { REDIS_CLIENT } from '../../redis';

@Injectable()
export class BidRepository {
  // 30 days in seconds
  private readonly BID_TTL = 30 * 24 * 60 * 60;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Place a new bid
   * - Stores bid details in bid:{bidId}
   * - Adds to sorted set bids:{productId} with score = amount
   * - Adds bidId to user:bids:{userId} list
   */
  async placeBid(
    productId: string,
    userId: string,
    amount: number,
  ): Promise<IBid> {
    const bidId = uuidv4();
    const timestamp = Date.now();

    const bid: IBid = {
      bidId,
      productId,
      userId,
      amount,
      timestamp,
      status: 'active',
    };

    const bidKey = `bid:${bidId}`;
    const sortedSetKey = `bids:${productId}`;
    const userBidsKey = `user:bids:${userId}`;
    const member = `${userId}:${amount}:${timestamp}`;

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    
    // Store bid details
    pipeline.set(bidKey, JSON.stringify(bid));
    
    // Add to product's sorted set (score = amount for descending order)
    pipeline.zadd(sortedSetKey, amount, member);
    
    // Add to user's bids list
    pipeline.lpush(userBidsKey, bidId);

    await pipeline.exec();

    return bid;
  }

  /**
   * Get bid by ID
   */
  async getBidById(bidId: string): Promise<IBid | null> {
    const key = `bid:${bidId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as IBid;
  }

  /**
   * Get all bids for a product in descending order by amount
   */
  async getProductBids(productId: string): Promise<IBid[]> {
    const sortedSetKey = `bids:${productId}`;
    
    // Get all members with scores in descending order
    const members = await this.redis.zrevrange(sortedSetKey, 0, -1, 'WITHSCORES');
    
    if (!members || members.length === 0) {
      return [];
    }

    const bids: IBid[] = [];
    
    // Parse members (format: userId:amount:timestamp)
    for (let i = 0; i < members.length; i += 2) {
      const member = members[i];
      const score = parseFloat(members[i + 1]);
      const [userId, , timestampStr] = member.split(':');
      const timestamp = parseInt(timestampStr, 10);

      // Find the bid details from the sorted set member
      const bid: IBid = {
        bidId: '', // Will be populated if we need full details
        productId,
        userId,
        amount: score,
        timestamp,
        status: 'active',
      };

      bids.push(bid);
    }

    return bids;
  }

  /**
   * Get all bids for a product with full details
   */
  async getProductBidsWithDetails(productId: string): Promise<IBid[]> {
    const sortedSetKey = `bids:${productId}`;
    
    // Get all members in descending order
    const members = await this.redis.zrevrange(sortedSetKey, 0, -1);
    
    if (!members || members.length === 0) {
      return [];
    }

    const bids: IBid[] = [];
    
    for (const member of members) {
      const [userId, amountStr, timestampStr] = member.split(':');
      const amount = parseFloat(amountStr);
      const timestamp = parseInt(timestampStr, 10);

      // Try to find the bid by searching user's bids
      const userBidsKey = `user:bids:${userId}`;
      const userBidIds = await this.redis.lrange(userBidsKey, 0, -1);
      
      let foundBid: IBid | null = null;
      for (const bidId of userBidIds) {
        const bid = await this.getBidById(bidId);
        if (bid && bid.productId === productId && bid.amount === amount) {
          foundBid = bid;
          break;
        }
      }

      if (foundBid) {
        bids.push(foundBid);
      } else {
        // Fallback: create bid from sorted set data
        bids.push({
          bidId: `${userId}-${productId}-${timestamp}`,
          productId,
          userId,
          amount,
          timestamp,
          status: 'active',
        });
      }
    }

    return bids;
  }

  /**
   * Get highest bid for a product
   */
  async getHighestBid(productId: string): Promise<IBid | null> {
    const sortedSetKey = `bids:${productId}`;
    
    // Get the member with highest score
    const result = await this.redis.zrevrange(sortedSetKey, 0, 0, 'WITHSCORES');
    
    if (!result || result.length === 0) {
      return null;
    }

    const member = result[0];
    const score = parseFloat(result[1]);
    const [userId, , timestampStr] = member.split(':');
    const timestamp = parseInt(timestampStr, 10);

    // Try to find full bid details
    const userBidsKey = `user:bids:${userId}`;
    const userBidIds = await this.redis.lrange(userBidsKey, 0, -1);
    
    for (const bidId of userBidIds) {
      const bid = await this.getBidById(bidId);
      if (bid && bid.productId === productId && bid.amount === score) {
        return bid;
      }
    }

    // Fallback
    return {
      bidId: `${userId}-${productId}-${timestamp}`,
      productId,
      userId,
      amount: score,
      timestamp,
      status: 'active',
    };
  }

  /**
   * Get all bids by a user
   */
  async getUserBids(userId: string): Promise<IBid[]> {
    const userBidsKey = `user:bids:${userId}`;
    const bidIds = await this.redis.lrange(userBidsKey, 0, -1);

    if (!bidIds || bidIds.length === 0) {
      return [];
    }

    const bids: IBid[] = [];
    for (const bidId of bidIds) {
      const bid = await this.getBidById(bidId);
      if (bid) {
        bids.push(bid);
      }
    }

    return bids;
  }

  /**
   * Update bid status
   */
  async updateBidStatus(bidId: string, status: BidStatus): Promise<IBid | null> {
    const bid = await this.getBidById(bidId);
    
    if (!bid) {
      return null;
    }

    bid.status = status;
    const key = `bid:${bidId}`;
    await this.redis.set(key, JSON.stringify(bid));

    return bid;
  }

  /**
   * Mark all other bids for a product as outbid (except the highest)
   */
  async markOtherBidsAsOutbid(productId: string, excludeBidId: string): Promise<void> {
    const bids = await this.getProductBidsWithDetails(productId);
    
    for (const bid of bids) {
      if (bid.bidId !== excludeBidId && bid.status === 'active') {
        await this.updateBidStatus(bid.bidId, 'outbid');
      }
    }
  }

  /**
   * Get winner (highest bid) for an ended auction
   */
  async getWinner(productId: string): Promise<IBid | null> {
    const highestBid = await this.getHighestBid(productId);
    
    if (!highestBid) {
      return null;
    }

    // Mark as winner
    if (highestBid.bidId) {
      await this.updateBidStatus(highestBid.bidId, 'winner');
    }

    return { ...highestBid, status: 'winner' };
  }

  /**
   * Initialize sorted set for a product (called when auction starts)
   */
  async initializeProductBids(productId: string): Promise<void> {
    // Just ensure the key exists (no-op if already exists)
    const sortedSetKey = `bids:${productId}`;
    const exists = await this.redis.exists(sortedSetKey);
    
    if (!exists) {
      // Create empty sorted set by adding and removing a dummy member
      await this.redis.zadd(sortedSetKey, 0, '__init__');
      await this.redis.zrem(sortedSetKey, '__init__');
    }
  }

  /**
   * Set TTL on bid-related keys after auction ends
   */
  async setAuctionEndedTTL(productId: string): Promise<void> {
    const sortedSetKey = `bids:${productId}`;
    
    // Get all bids to set TTL on individual bid keys
    const members = await this.redis.zrange(sortedSetKey, 0, -1);
    
    const pipeline = this.redis.pipeline();
    
    // Set TTL on sorted set
    pipeline.expire(sortedSetKey, this.BID_TTL);
    
    // Set TTL on individual bid keys
    for (const member of members) {
      const [userId] = member.split(':');
      const userBidsKey = `user:bids:${userId}`;
      
      // Get bid IDs for this user
      const bidIds = await this.redis.lrange(userBidsKey, 0, -1);
      for (const bidId of bidIds) {
        const bid = await this.getBidById(bidId);
        if (bid && bid.productId === productId) {
          pipeline.expire(`bid:${bidId}`, this.BID_TTL);
        }
      }
    }

    await pipeline.exec();
  }

  /**
   * Get bid count for a product
   */
  async getBidCount(productId: string): Promise<number> {
    const sortedSetKey = `bids:${productId}`;
    return await this.redis.zcard(sortedSetKey);
  }

  /**
   * Check if user has already bid on a product
   */
  async hasUserBidOnProduct(productId: string, userId: string): Promise<boolean> {
    const sortedSetKey = `bids:${productId}`;
    const members = await this.redis.zrange(sortedSetKey, 0, -1);
    
    return members.some(member => member.startsWith(`${userId}:`));
  }

  /**
   * Get user's previous bid on a product (if any)
   */
  async getUserPreviousBid(productId: string, userId: string): Promise<IBid | null> {
    const userBids = await this.getUserBids(userId);
    return userBids.find(bid => bid.productId === productId) || null;
  }
}
