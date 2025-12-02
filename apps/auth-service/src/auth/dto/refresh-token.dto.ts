import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;

  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;
}
