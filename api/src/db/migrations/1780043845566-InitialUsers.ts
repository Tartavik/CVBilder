import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialUsers1780043845566 implements MigrationInterface {
    name = 'InitialUsers1780043845566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'user', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "location" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "REL_9e432b7df0d182f8d292902d1a" UNIQUE ("user_id"), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."settings_theme_enum" AS ENUM('light', 'dark')`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "theme" "public"."settings_theme_enum" NOT NULL DEFAULT 'light', "user_id" uuid, CONSTRAINT "REL_a2883eaa72b3b2e8c98e744609" UNIQUE ("user_id"), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_a2883eaa72b3b2e8c98e7446098" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" DROP CONSTRAINT "FK_a2883eaa72b3b2e8c98e7446098"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TYPE "public"."settings_theme_enum"`);
        await queryRunner.query(`DROP TABLE "profiles"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
