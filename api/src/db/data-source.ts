import { join } from 'path';
import { DataSource } from 'typeorm';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { ProfileEntity } from '../../../backend/users/src/lib/profile.entity';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { SettingsEntity } from '../../../backend/users/src/lib/settings.entity';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { UserEntity } from '../../../backend/users/src/lib/user.entity';

export const AppDataSource = new DataSource({
	type: 'postgres',
	host: process.env.DB_HOST ?? 'localhost',
	port: Number(process.env.DB_PORT ?? 5432),
	username: process.env.DB_USERNAME ?? 'postgres',
	password: process.env.DB_PASSWORD ?? 'postgres',
	database: process.env.DB_NAME ?? 'cvbilder',
	entities: [UserEntity, ProfileEntity, SettingsEntity],
	migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});
