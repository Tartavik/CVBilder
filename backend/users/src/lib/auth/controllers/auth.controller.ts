import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';
import { AuthTokenService } from '../services/auth-token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.login(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    return this.authTokenService.createSession(user);
  }
}
