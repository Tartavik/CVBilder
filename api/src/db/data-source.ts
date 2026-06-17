/* eslint-disable @nx/enforce-module-boundaries */
import { join } from 'path';
import { DataSource } from 'typeorm';
import { ProfileEntity } from '../../../backend/users/src/lib/profile.entity';
import { SettingsEntity } from '../../../backend/users/src/lib/settings.entity';
import { UserEntity } from '../../../backend/users/src/lib/user.entity';
import { GeneralSkillEntity } from '../../../backend/users/src/lib/general-skill.entity';
import { ExperienceSkillEntity } from '../../../backend/users/src/lib/experience-skill.entity';
import { PersonalDetailEntity } from '../../../backend/users/src/lib/personalDetail.entity';
import { ExperienceEntity } from '../../../backend/users/src/lib/experience.entity';
import { CvEntity } from '../../../backend/users/src/lib/cv.entity';
import { EducationEntity } from '../../../backend/users/src/lib/education.entity';

export const AppDataSource = new DataSource({
	type: 'postgres',
	host: process.env.DB_HOST ?? 'localhost',
	port: Number(process.env.DB_PORT ?? 5432),
	username: process.env.DB_USERNAME ?? 'postgres',
	password: process.env.DB_PASSWORD ?? 'postgres',
	database: process.env.DB_NAME ?? 'cvbilder',
	entities: [UserEntity, ProfileEntity, SettingsEntity, CvEntity, ExperienceEntity, ExperienceSkillEntity, PersonalDetailEntity, GeneralSkillEntity, EducationEntity],
	migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});
