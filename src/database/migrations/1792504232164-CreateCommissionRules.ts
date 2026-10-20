import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommissionRules1792504232164 implements MigrationInterface {
  name = 'CreateCommissionRules1792504232164';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "commission_rules" ("commission_rule_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "description" text, "calculation_type" character varying(20) NOT NULL, "value" numeric(12,2) NOT NULL, "scope" character varying(20) NOT NULL, "employee_id" uuid, "min_amount" numeric(12,2) NOT NULL DEFAULT '0', "max_amount" numeric(12,2), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_commission_rules_amount_range" CHECK ("min_amount" >= 0 AND ("max_amount" IS NULL OR "max_amount" >= "min_amount")), CONSTRAINT "CHK_commission_rules_value" CHECK ("value" > 0 AND ("calculation_type" <> 'percentage' OR "value" <= 100)), CONSTRAINT "CHK_commission_rules_scope_employee" CHECK (("scope" = 'employee' AND "employee_id" IS NOT NULL) OR ("scope" = 'global' AND "employee_id" IS NULL)), CONSTRAINT "CHK_commission_rules_scope" CHECK ("scope" IN ('global', 'employee')), CONSTRAINT "CHK_commission_rules_calculation_type" CHECK ("calculation_type" IN ('percentage', 'fixed')), CONSTRAINT "PK_commission_rules" PRIMARY KEY ("commission_rule_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commission_rules_employee_id" ON "commission_rules" ("employee_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_rules" ADD CONSTRAINT "FK_commission_rules_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commission_rules" DROP CONSTRAINT "FK_commission_rules_employee_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_rules_employee_id"`,
    );
    await queryRunner.query(`DROP TABLE "commission_rules"`);
  }
}
