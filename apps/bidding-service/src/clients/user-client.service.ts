import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableError } from '@app/shared';

export interface User {
  _id: string;
  email: string;
  role: 'buyer' | 'seller';
  profile: {
    name: string;
  };
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

  async getUser(userId: string): Promise<User | null> {
    try {
      // Use internal endpoint that doesn't require auth
      const response = await fetch(`${this.baseUrl}/users/internal/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      this.logger.error(`Failed to fetch user: ${error}`);
      throw new ServiceUnavailableError('User Service');
    }
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user !== null;
  }
}
