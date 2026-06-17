import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCvPhotosAndSkillIcons1781590000000
  implements MigrationInterface
{
  name = 'AddCvPhotosAndSkillIcons1781590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personal_details" ADD "photo_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "cvs" ADD "experience_skill_mode" character varying NOT NULL DEFAULT 'text'`,
    );
    await queryRunner.query(
      `ALTER TABLE "experience_skills" ADD "icon" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "experience_skills" DROP COLUMN "icon"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cvs" DROP COLUMN "experience_skill_mode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_details" DROP COLUMN "photo_url"`,
    );
  }
}
