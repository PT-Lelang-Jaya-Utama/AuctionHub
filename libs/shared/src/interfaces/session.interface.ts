import { UserRole } from './user.interface';

export interface ISession {
  userId: string;
  email: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}

export interface IRefreshToken {
  token: string;
  expiresAt: number;
}
