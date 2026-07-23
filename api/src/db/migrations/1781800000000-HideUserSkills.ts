import { MigrationInterface, QueryRunner } from 'typeorm';

export class HideUserSkills1781800000000 implements MigrationInterface {
  name = 'HideUserSkills1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_skills" ADD "hidden" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_skills" DROP COLUMN "hidden"`,
    );
  }
}
