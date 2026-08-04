import { CvEntity } from '../cvs/entities/cv.entity';
import { EducationEntity } from '../cvs/entities/education.entity';
import { ExperienceSkillEntity } from '../cvs/entities/experience-skill.entity';
import { ExperienceEntity } from '../cvs/entities/experience.entity';
import { GeneralSkillEntity } from '../cvs/entities/general-skill.entity';
import { PersonalDetailEntity } from '../cvs/entities/personal-detail.entity';
import { UserSkillEntity } from '../skills/entities/user-skill.entity';
import { ProfileEntity } from '../users/entities/profile.entity';
import { SettingsEntity } from '../users/entities/settings.entity';
import { UserEntity } from '../users/entities/user.entity';

export const USER_ENTITIES = [UserEntity, ProfileEntity, SettingsEntity];

export const CV_ENTITIES = [
  CvEntity,
  ExperienceEntity,
  ExperienceSkillEntity,
  PersonalDetailEntity,
  GeneralSkillEntity,
  EducationEntity,
];

export const SKILL_ENTITIES = [UserSkillEntity];

export const DATABASE_ENTITIES = [
  ...USER_ENTITIES,
  ...CV_ENTITIES,
  ...SKILL_ENTITIES,
];
