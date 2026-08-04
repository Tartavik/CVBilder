import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CV_ENTITIES } from '../database/database.entities';
import { SkillsModule } from '../skills/skills.module';
import { UsersModule } from '../users/users.module';
import { PublicCvsController } from './controllers/public-cvs.controller';
import { UserCvsController } from './controllers/user-cvs.controller';
import { CvPhotoService } from './services/cv-photo.service';
import { CvQueryService } from './services/cv-query.service';
import { CvValidationService } from './services/cv-validation.service';
import { CvService } from './services/cv.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    SkillsModule,
    TypeOrmModule.forFeature(CV_ENTITIES),
  ],
  controllers: [UserCvsController, PublicCvsController],
  providers: [CvService, CvQueryService, CvValidationService, CvPhotoService],
})
export class CvsModule {}
