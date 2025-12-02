import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableError } from '@app/shared';

export interface Product {
  _id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  startingPrice: number;
  currentPrice: number;
  condition: string;
  auction: {
    status: string;
    startTime?: Date;
    endTime?: Date;
    winnerId?: string;
    totalBids: number;
  };
  createdAt: Date;
  updatedAt: Date;
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

  async getSellerProducts(sellerId: string): Promise<Product[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/products/seller/${sellerId}`,
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
      this.logger.error(`Failed to fetch seller products: ${error}`);
      throw new ServiceUnavailableError('Product Service');
    }
  }
}
