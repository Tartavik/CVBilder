import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthTokenService } from './services/auth-token.service';
import { AuthService } from './services/auth.service';

const LOCAL_JWT_SECRET =
  'cvbilder-local-development-secret-change-this-before-production';
const JWT_ISSUER = 'cvbilder-api';
const JWT_AUDIENCE = 'cvbilder-web';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const configuredSecret = configService.get<string>('JWT_SECRET');
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';

        if (isProduction && !configuredSecret) {
          throw new Error('JWT_SECRET must be configured in production');
        }

        return {
          secret: configuredSecret || LOCAL_JWT_SECRET,
          signOptions: {
            expiresIn: '1h',
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
          },
          verifyOptions: {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
