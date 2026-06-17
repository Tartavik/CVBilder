import { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreCvLayout1781000000000 implements MigrationInterface {
  name = 'StoreCvLayout1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cvs" ADD "template" character varying NOT NULL DEFAULT 'single'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cvs" ADD "section_order" jsonb NOT NULL DEFAULT '["personal","experience","education","skills","details"]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cvs" DROP COLUMN "section_order"`);
    await queryRunner.query(`ALTER TABLE "cvs" DROP COLUMN "template"`);
  }
}
