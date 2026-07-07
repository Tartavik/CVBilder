import { Module } from '@nestjs/common';
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

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ProfileEntity, SettingsEntity, CvEntity, ExperienceEntity, ExperienceSkillEntity, UserSkillEntity, PersonalDetailEntity, GeneralSkillEntity, EducationEntity])],
  controllers: [UsersController, CvsController],
  providers: [UsersService, AiIconService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
