import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableError } from '@app/shared';

export interface Bid {
  bidId: string;
  productId: string;
  userId: string;
  amount: number;
  timestamp: number;
  status: string;
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

  async getUserBids(userId: string): Promise<Bid[]> {
    try {
      const response = await fetch(`${this.baseUrl}/bids/user/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch user bids: ${error}`);
      throw new ServiceUnavailableError('Bidding Service');
    }
  }
}
