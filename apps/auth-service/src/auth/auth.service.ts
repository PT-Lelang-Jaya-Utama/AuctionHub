import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { 
  ISession, 
  UnauthorizedError, 
  BadRequestError,
  ApiResponse 
} from '@app/shared';
import { SessionRepository } from '../session';
import { UserClientService } from '../user-client';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly userClientService: UserClientService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Create user via User Service (user-service handles password hashing)
    const user = await this.userClientService.createUser({
      email: dto.email,
      password: dto.password,
      role: dto.role,
      name: dto.name,
    });

    // Create session
    const { sessionId, session } = await this.sessionRepository.createSession(
      user._id,
      user.email,
      user.role,
    );

    // Create refresh token
    const { token: refreshToken } = await this.sessionRepository.createRefreshToken(user._id);

    // Generate JWT
    const accessToken = this.generateAccessToken(sessionId, user._id, user.email, user.role);

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: session.expiresAt - session.createdAt,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Validate credentials via User Service
    const user = await this.userClientService.validateCredentials({
      email: dto.email,
      password: dto.password,
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Create session
    const { sessionId, session } = await this.sessionRepository.createSession(
      user._id,
      user.email,
      user.role,
    );

    // Create refresh token
    const { token: refreshToken } = await this.sessionRepository.createRefreshToken(user._id);

    // Generate JWT
    const accessToken = this.generateAccessToken(sessionId, user._id, user.email, user.role);

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: session.expiresAt - session.createdAt,
      },
    };
  }

  async logout(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.getSession(sessionId);
    
    if (session) {
      await this.sessionRepository.deleteSession(sessionId);
      await this.sessionRepository.deleteRefreshToken(session.userId);
    }
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponse> {
    // Validate refresh token
    const isValid = await this.sessionRepository.validateRefreshToken(
      dto.userId,
      dto.refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user info
    const user = await this.userClientService.getUserById(dto.userId);

    // Delete old refresh token
    await this.sessionRepository.deleteRefreshToken(dto.userId);

    // Create new session
    const { sessionId, session } = await this.sessionRepository.createSession(
      user._id,
      user.email,
      user.role,
    );

    // Create new refresh token
    const { token: refreshToken } = await this.sessionRepository.createRefreshToken(user._id);

    // Generate new JWT
    const accessToken = this.generateAccessToken(sessionId, user._id, user.email, user.role);

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: session.expiresAt - session.createdAt,
      },
    };
  }

  async verify(sessionId: string): Promise<ISession> {
    const session = await this.sessionRepository.getSession(sessionId);

    if (!session) {
      throw new UnauthorizedError('Session not found or expired');
    }

    if (Date.now() > session.expiresAt) {
      await this.sessionRepository.deleteSession(sessionId);
      throw new UnauthorizedError('Session expired');
    }

    return session;
  }

  private generateAccessToken(
    sessionId: string,
    userId: string,
    email: string,
    role: string,
  ): string {
    return this.jwtService.sign({
      sub: userId,
      sessionId,
      email,
      role,
    });
  }
}
