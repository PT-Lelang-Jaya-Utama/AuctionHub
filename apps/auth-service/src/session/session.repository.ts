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

    const key = `refresh:${userId}`;
    await this.redis.setex(key, this.refreshTokenTTL, JSON.stringify(refreshToken));

    return { token, refreshToken };
  }

  async getRefreshToken(userId: string): Promise<IRefreshToken | null> {
    const key = `refresh:${userId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as IRefreshToken;
  }

  async deleteRefreshToken(userId: string): Promise<boolean> {
    const key = `refresh:${userId}`;
    const result = await this.redis.del(key);
    return result > 0;
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const storedToken = await this.getRefreshToken(userId);
    
    if (!storedToken) {
      return false;
    }

    if (storedToken.token !== token) {
      return false;
    }

    if (Date.now() > storedToken.expiresAt) {
      await this.deleteRefreshToken(userId);
      return false;
    }

    return true;
  }
}
