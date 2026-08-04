import { UserRole } from '../users/entities/user.entity';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}
