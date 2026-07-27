import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileEntity } from './profile.entity';
import { SettingsEntity } from './settings.entity';
import { UserEntity } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CvEntity } from './cv.entity';
import { ExperienceEntity } from './experience.entity';
import { GeneralSkillEntity } from './general-skill.entity';
import { ExperienceSkillEntity } from './experience-skill.entity';
import { UserSkillEntity } from './user-skill.entity';
import { PersonalDetailEntity } from './personalDetail.entity';
import { EducationEntity } from './education.entity';
import { CvsController } from './cvs.controller';
import { AiIconService } from './ai-icon.service';
import { CvQueryService } from './cv-query.service';
import { AuthTokenService } from './auth-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const LOCAL_JWT_SECRET =
  'cvbilder-local-development-secret-change-this-before-production';
const JWT_ISSUER = 'cvbilder-api';
const JWT_AUDIENCE = 'cvbilder-web';

@Module({
  imports: [
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
    TypeOrmModule.forFeature([
      UserEntity,
      ProfileEntity,
      SettingsEntity,
      CvEntity,
      ExperienceEntity,
      ExperienceSkillEntity,
      UserSkillEntity,
      PersonalDetailEntity,
      GeneralSkillEntity,
      EducationEntity,
    ]),
  ],
  controllers: [UsersController, CvsController],
  providers: [
    UsersService,
    CvQueryService,
    AiIconService,
    AuthTokenService,
    JwtAuthGuard,
  ],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
