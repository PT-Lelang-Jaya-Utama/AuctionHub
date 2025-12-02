import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableError } from '@app/shared';

export interface Bid {
  bidId: string;
  productId: string;
  userId: string;
  amount: number;
  timestamp: number;
  status: 'active' | 'outbid' | 'winner';
}

export interface Winner {
  userId: string;
  amount: number;
  bidId: string;
}

@Injectable()
export class BiddingClientService {
  private readonly logger = new Logger(BiddingClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'BIDDING_SERVICE_URL',
      'http://bidding-service:3003',
    );
  }

  async getProductBids(productId: string): Promise<Bid[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bids/product/${productId}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch product bids: ${error}`);
      throw new ServiceUnavailableError('Bidding Service');
    }
  }

  async getHighestBid(productId: string): Promise<Bid | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bids/product/${productId}/highest`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      this.logger.error(`Failed to fetch highest bid: ${error}`);
      throw new ServiceUnavailableError('Bidding Service');
    }
  }

  async getWinner(productId: string): Promise<Winner | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bids/product/${productId}/winner`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      this.logger.error(`Failed to fetch winner: ${error}`);
      throw new ServiceUnavailableError('Bidding Service');
    }
  }
}
