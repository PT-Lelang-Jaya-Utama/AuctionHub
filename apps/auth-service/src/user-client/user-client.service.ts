import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser, ServiceUnavailableError, NotFoundError, ConflictError } from '@app/shared';

interface CreateUserPayload {
  email: string;
  password: string;
  role: 'buyer' | 'seller';
  name: string;
}

interface ValidateCredentialsPayload {
  email: string;
  password: string;
}

@Injectable()
export class UserClientService {
  private readonly userServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.userServiceUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://user-service:3001',
    );
  }

  async createUser(payload: CreateUserPayload): Promise<IUser> {
    try {
      const response = await fetch(`${this.userServiceUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          role: payload.role,
          profile: {
            name: payload.name,
            phone: '-',
            address: {
              street: '-',
              city: '-',
              province: '-',
              postalCode: '-',
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          throw new ConflictError(error.error || 'Email already exists');
        }
        throw new ServiceUnavailableError('User Service');
      }

      const result = await response.json();
      return result.data as IUser;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new ServiceUnavailableError('User Service');
    }
  }

  async validateCredentials(payload: ValidateCredentialsPayload): Promise<IUser | null> {
    try {
      const response = await fetch(
        `${this.userServiceUrl}/users/validate-credentials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          return null;
        }
        throw new ServiceUnavailableError('User Service');
      }

      const result = await response.json();
      return result.data as IUser;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError('User Service');
    }
  }

  async getUserById(userId: string): Promise<IUser> {
    try {
      const response = await fetch(`${this.userServiceUrl}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError('User', userId);
        }
        throw new ServiceUnavailableError('User Service');
      }

      const result = await response.json();
      return result.data as IUser;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError('User Service');
    }
  }
}
