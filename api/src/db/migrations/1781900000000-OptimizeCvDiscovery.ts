import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeCvDiscovery1781900000000 implements MigrationInterface {
  name = 'OptimizeCvDiscovery1781900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_cvs_created_at" ON "cvs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cvs_title_lower" ON "cvs" (LOWER("title"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_personal_details_cv_id" ON "personal_details" ("cv_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_experiences_cv_id" ON "experiences" ("cv_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_education_cv_id" ON "education" ("cv_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_general_skills_cv_id" ON "general_skills" ("cv_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_experience_skills_experience_id" ON "experience_skills" ("experience_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_experience_skills_experience_id"`);
    await queryRunner.query(`DROP INDEX "IDX_general_skills_cv_id"`);
    await queryRunner.query(`DROP INDEX "IDX_education_cv_id"`);
    await queryRunner.query(`DROP INDEX "IDX_experiences_cv_id"`);
    await queryRunner.query(`DROP INDEX "IDX_personal_details_cv_id"`);
    await queryRunner.query(`DROP INDEX "IDX_cvs_title_lower"`);
    await queryRunner.query(`DROP INDEX "IDX_cvs_created_at"`);
  }
}
