import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableError } from '@app/shared';

export interface Product {
  _id: string;
  sellerId: string;
  title: string;
  startingPrice: number;
  currentPrice: number;
  auction: {
    status: 'draft' | 'active' | 'ended' | 'cancelled';
    startTime?: string;
    endTime?: string;
    winnerId?: string;
    totalBids: number;
  };
}

@Injectable()
export class ProductClientService {
  private readonly logger = new Logger(ProductClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'PRODUCT_SERVICE_URL',
      'http://product-service:3002',
    );
  }

  async getProduct(productId: string): Promise<Product | null> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${productId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      this.logger.error(`Failed to fetch product: ${error}`);
      throw new ServiceUnavailableError('Product Service');
    }
  }

  async isAuctionActive(productId: string): Promise<{ active: boolean; product: Product | null }> {
    const product = await this.getProduct(productId);
    
    if (!product) {
      return { active: false, product: null };
    }

    const isActive = product.auction.status === 'active';
    return { active: isActive, product };
  }
}
