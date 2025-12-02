import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { ISession, IRefreshToken, UserRole } from '@app/shared';
import { REDIS_CLIENT } from '../redis';

@Injectable()
export class SessionRepository {
  private readonly sessionTTL: number;
  private readonly refreshTokenTTL: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    // 24 hours in seconds
    this.sessionTTL = this.parseTTL(
      this.configService.get<string>('JWT_EXPIRATION', '24h'),
    );
    // 7 days in seconds
    this.refreshTokenTTL = this.parseTTL(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRATION', '7d'),
    );
  }

  private parseTTL(ttlString: string): number {
    const match = ttlString.match(/^(\d+)([hdms])$/);
    if (!match) return 86400; // default 24h

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60;
      case 'h':
        return value * 60 * 60;
      case 'm':
        return value * 60;
      case 's':
        return value;
      default:
        return 86400;
    }
  }

  async createSession(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<{ sessionId: string; session: ISession }> {
    const sessionId = uuidv4();
    const now = Date.now();
    const session: ISession = {
      userId,
      email,
      role,
      createdAt: now,
      expiresAt: now + this.sessionTTL * 1000,
    };

    const key = `session:${sessionId}`;
    await this.redis.setex(key, this.sessionTTL, JSON.stringify(session));

    return { sessionId, session };
  }

  async getSession(sessionId: string): Promise<ISession | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as ISession;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    const result = await this.redis.del(key);
    return result > 0;
  }

  async createRefreshToken(userId: string): Promise<{ token: string; refreshToken: IRefreshToken }> {
    const token = uuidv4();
    const now = Date.now();
    const refreshToken: IRefreshToken = {
      token,
      expiresAt: now + this.refreshTokenTTL * 1000,
    };

    // Store by token so we can look up userId from token
    const tokenKey = `refresh:${token}`;
    await this.redis.setex(tokenKey, this.refreshTokenTTL, JSON.stringify({ userId, ...refreshToken }));

    // Also store mapping from userId to token for logout
    const userKey = `refresh_user:${userId}`;
    await this.redis.setex(userKey, this.refreshTokenTTL, token);

    return { token, refreshToken };
  }

  async getRefreshTokenData(token: string): Promise<{ userId: string; token: string; expiresAt: number } | null> {
    const key = `refresh:${token}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    // Get userId from token data first
    const tokenData = await this.getRefreshTokenData(token);
    
    const tokenKey = `refresh:${token}`;
    const result = await this.redis.del(tokenKey);
    
    // Also delete the user mapping if we have userId
    if (tokenData?.userId) {
      const userKey = `refresh_user:${tokenData.userId}`;
      await this.redis.del(userKey);
    }
    
    return result > 0;
  }

  async deleteRefreshTokenByUserId(userId: string): Promise<boolean> {
    // Get token from user mapping
    const userKey = `refresh_user:${userId}`;
    const token = await this.redis.get(userKey);
    
    if (token) {
      const tokenKey = `refresh:${token}`;
      await this.redis.del(tokenKey);
    }
    
    const result = await this.redis.del(userKey);
    return result > 0;
  }

  async validateRefreshToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const storedData = await this.getRefreshTokenData(token);
    
    if (!storedData) {
      return { valid: false };
    }

    if (Date.now() > storedData.expiresAt) {
      await this.deleteRefreshToken(token);
      return { valid: false };
    }

    return { valid: true, userId: storedData.userId };
  }
}
