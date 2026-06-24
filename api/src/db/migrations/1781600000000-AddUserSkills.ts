import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSkills1781600000000 implements MigrationInterface {
  name = 'AddUserSkills1781600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "experience_skills" ALTER COLUMN "icon" TYPE text`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "icon" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_user_skills_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_skills_user_name" ON "user_skills" ("user_id", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_skills" ADD CONSTRAINT "FK_user_skills_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_skills" DROP CONSTRAINT "FK_user_skills_user"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_user_skills_user_name"`);
    await queryRunner.query(`DROP TABLE "user_skills"`);
    await queryRunner.query(
      `ALTER TABLE "experience_skills" ALTER COLUMN "icon" TYPE character varying`,
    );
  }
}
