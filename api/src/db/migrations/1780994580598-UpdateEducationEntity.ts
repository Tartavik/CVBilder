import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEducationEntity1780994580598 implements MigrationInterface {
    name = 'UpdateEducationEntity1780994580598'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "education" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "education" ALTER COLUMN "description" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "education" ALTER COLUMN "description" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "education" DROP COLUMN "created_at"`);
    }

}
