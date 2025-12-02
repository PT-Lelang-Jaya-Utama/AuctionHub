import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiResponse, UnauthorizedError } from '@app/shared';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return ApiResponse.success(result, 'User registered successfully');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return ApiResponse.success(result, 'Login successful');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') authHeader: string) {
    const sessionId = this.extractSessionIdFromToken(authHeader);
    await this.authService.logout(sessionId);
    return ApiResponse.success(null, 'Logout successful');
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto);
    return ApiResponse.success(result, 'Token refreshed successfully');
  }

  @Get('verify')
  async verify(@Headers('authorization') authHeader: string) {
    const sessionId = this.extractSessionIdFromToken(authHeader);
    const session = await this.authService.verify(sessionId);
    return ApiResponse.success(session, 'Session is valid');
  }

  private extractSessionIdFromToken(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.sessionId;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
