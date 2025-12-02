import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';
import { UserRole } from '@app/shared';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsIn(['buyer', 'seller'], { message: 'Role must be either buyer or seller' })
  role: UserRole;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;
}
