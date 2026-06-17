import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExperienceSkills1781510000000 implements MigrationInterface {
  name = 'AddExperienceSkills1781510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "skills" RENAME TO "general_skills"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_general_skills_name_lower" ON "general_skills" (LOWER("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "experience_skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "experience_id" uuid, CONSTRAINT "PK_experience_skills" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "experience_skills" ADD CONSTRAINT "FK_experience_skills_experience" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_experience_skills_name_lower" ON "experience_skills" (LOWER("name"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_experience_skills_name_lower"`);
    await queryRunner.query(
      `ALTER TABLE "experience_skills" DROP CONSTRAINT "FK_experience_skills_experience"`,
    );
    await queryRunner.query(`DROP TABLE "experience_skills"`);
    await queryRunner.query(`DROP INDEX "IDX_general_skills_name_lower"`);
    await queryRunner.query(`ALTER TABLE "general_skills" RENAME TO "skills"`);
  }
}
