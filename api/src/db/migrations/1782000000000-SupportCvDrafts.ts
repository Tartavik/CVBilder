import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupportCvDrafts1782000000000 implements MigrationInterface {
  name = 'SupportCvDrafts1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cvs" ADD "is_published" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`UPDATE "cvs" SET "is_published" = true`);
    await queryRunner.query(
      `ALTER TABLE "experiences" ALTER COLUMN "start_date" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "is_current" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "experiences" SET "is_current" = true WHERE "end_date" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "education" ALTER COLUMN "graduation_year" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cvs_is_published_created_at" ON "cvs" ("is_published", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_cvs_is_published_created_at"`);
    await queryRunner.query(
      `UPDATE "experiences" SET "start_date" = CURRENT_DATE WHERE "start_date" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "education" SET "graduation_year" = EXTRACT(YEAR FROM CURRENT_DATE)::integer WHERE "graduation_year" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "education" ALTER COLUMN "graduation_year" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ALTER COLUMN "start_date" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "is_current"`,
    );
    await queryRunner.query(`ALTER TABLE "cvs" DROP COLUMN "is_published"`);
  }
}
