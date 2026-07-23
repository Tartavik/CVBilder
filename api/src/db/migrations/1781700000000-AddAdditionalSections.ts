import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdditionalSections1781700000000
  implements MigrationInterface
{
  name = 'AddAdditionalSections1781700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cvs" ADD "additional_sections" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `UPDATE "cvs"
       SET "section_order" = "section_order" || '["additional"]'::jsonb
       WHERE NOT ("section_order" ? 'additional')`,
    );
    await queryRunner.query(
      `ALTER TABLE "cvs"
       ALTER COLUMN "section_order"
       SET DEFAULT '["personal","experience","education","skills","additional","details"]'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cvs"
       ALTER COLUMN "section_order"
       SET DEFAULT '["personal","experience","education","skills","details"]'::jsonb`,
    );
    await queryRunner.query(
      `UPDATE "cvs"
       SET "section_order" = "section_order" - 'additional'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cvs" DROP COLUMN "additional_sections"`,
    );
  }
}
