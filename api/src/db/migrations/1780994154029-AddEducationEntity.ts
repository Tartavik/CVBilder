import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEducationEntity1780994154029 implements MigrationInterface {
    name = 'AddEducationEntity1780994154029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "education" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "degree" character varying NOT NULL, "graduation_year" integer NOT NULL, "description" character varying NOT NULL, "cv_id" uuid, CONSTRAINT "PK_bf3d38701b3030a8ad634d43bd6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "education" ADD CONSTRAINT "FK_2ae9bd58213f90c67b30afafece" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "education" DROP CONSTRAINT "FK_2ae9bd58213f90c67b30afafece"`);
        await queryRunner.query(`DROP TABLE "education"`);
    }

}
