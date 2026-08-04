import { DATABASE_ENTITIES } from '@cvbilder/backend';
import { join } from 'path';
import { DataSource } from 'typeorm';

const connectionOptions = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'cvbilder',
    };

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...connectionOptions,
  entities: DATABASE_ENTITIES,
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});
