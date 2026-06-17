import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvEntities1780915048515 implements MigrationInterface {
    name = 'CreateCvEntities1780915048515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cvs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "REL_006a2a0b67a11a4b856dd3ae29" UNIQUE ("user_id"), CONSTRAINT "PK_e7d8a4d55eb4e7a2e43bea8d83a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "level" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "cv_id" uuid, CONSTRAINT "PK_0d3212120f4ecedf90864d7e298" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "personal_details" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying NOT NULL, "email" character varying, "phone_number" character varying, "address" character varying, "job_title" character varying, "summary" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "cv_id" uuid, CONSTRAINT "PK_d30ad86a6be960e31aca049615e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "experiences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_name" character varying NOT NULL, "position" character varying NOT NULL, "start_date" date NOT NULL, "end_date" date, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "cv_id" uuid, CONSTRAINT "PK_884f0913a63882712ea578e7c85" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "cvs" ADD CONSTRAINT "FK_006a2a0b67a11a4b856dd3ae29d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skills" ADD CONSTRAINT "FK_e9fc8b5fb55c5acc3b37152633f" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "personal_details" ADD CONSTRAINT "FK_715004b91b03d0060a02d233712" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "experiences" ADD CONSTRAINT "FK_01748b732b363bdb8683600d5aa" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "experiences" DROP CONSTRAINT "FK_01748b732b363bdb8683600d5aa"`);
        await queryRunner.query(`ALTER TABLE "personal_details" DROP CONSTRAINT "FK_715004b91b03d0060a02d233712"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT "FK_e9fc8b5fb55c5acc3b37152633f"`);
        await queryRunner.query(`ALTER TABLE "cvs" DROP CONSTRAINT "FK_006a2a0b67a11a4b856dd3ae29d"`);
        await queryRunner.query(`DROP TABLE "experiences"`);
        await queryRunner.query(`DROP TABLE "personal_details"`);
        await queryRunner.query(`DROP TABLE "skills"`);
        await queryRunner.query(`DROP TABLE "cvs"`);
    }

}
