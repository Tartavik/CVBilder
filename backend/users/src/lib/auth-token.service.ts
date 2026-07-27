import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload, AuthResponse, AuthUser } from './auth.types';

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60;

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async createSession(user: AuthUser): Promise<AuthResponse> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user,
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
  }
}
