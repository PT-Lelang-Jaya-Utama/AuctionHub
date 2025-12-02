import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableError, NotFoundError } from '@app/shared';

export interface User {
  _id: string;
  email: string;
  role: 'buyer' | 'seller';
  profile: {
    name: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    };
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserClientService {
  private readonly logger = new Logger(UserClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://user-service:3001',
    );
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError('User', userId);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error(`Failed to fetch user: ${error}`);
      throw new ServiceUnavailableError('User Service');
    }
  }

  async validateSeller(sellerId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(sellerId);
      return user.role === 'seller';
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }
      throw error;
    }
  }
}
