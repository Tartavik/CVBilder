import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleCvs1781080000000 implements MigrationInterface {
  name = 'AllowMultipleCvs1781080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cvs" DROP CONSTRAINT "REL_006a2a0b67a11a4b856dd3ae29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cvs" ADD "title" character varying NOT NULL DEFAULT 'Untitled CV'`,
    );
    await queryRunner.query(
      `UPDATE "cvs" SET "title" = COALESCE(NULLIF("personal_details"."full_name", ''), 'Untitled CV') FROM "personal_details" WHERE "personal_details"."cv_id" = "cvs"."id"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cvs_user_id" ON "cvs" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_cvs_user_id"`);
    await queryRunner.query(`ALTER TABLE "cvs" DROP COLUMN "title"`);
    await queryRunner.query(
      `ALTER TABLE "cvs" ADD CONSTRAINT "REL_006a2a0b67a11a4b856dd3ae29" UNIQUE ("user_id")`,
    );
  }
}
