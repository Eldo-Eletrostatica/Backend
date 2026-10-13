import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791931468203 implements MigrationInterface {
  name = 'InitialSchema1791931468203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "suppliers" ("supplier_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(150) NOT NULL, "contact" character varying(150) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_suppliers" PRIMARY KEY ("supplier_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "employees" ("employee_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(120) NOT NULL, "email" character varying(254) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'employee', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_employees_role" CHECK ("role" IN ('admin', 'manager', 'employee')), CONSTRAINT "PK_employees" PRIMARY KEY ("employee_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_employees_email" ON "employees" ("email") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_categories" ("inventory_category_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_inventory_categories" PRIMARY KEY ("inventory_category_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inventory_categories_name" ON "inventory_categories" ("name") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_items" ("inventory_item_id" uuid NOT NULL DEFAULT gen_random_uuid(), "inventory_category_id" uuid NOT NULL, "supplier_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "unit" character varying(20) NOT NULL, "balance" numeric(12,3) NOT NULL DEFAULT '0', "minimum_stock" numeric(12,3) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_inventory_items_minimum_stock" CHECK ("minimum_stock" >= 0), CONSTRAINT "CHK_inventory_items_balance" CHECK ("balance" >= 0), CONSTRAINT "CHK_inventory_items_unit" CHECK ("unit" IN ('kg', 'liter', 'unit')), CONSTRAINT "PK_inventory_items" PRIMARY KEY ("inventory_item_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_items_inventory_category_id" ON "inventory_items" ("inventory_category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_items_supplier_id" ON "inventory_items" ("supplier_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("stock_movement_id" uuid NOT NULL DEFAULT gen_random_uuid(), "inventory_item_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "type" character varying(20) NOT NULL, "quantity" numeric(12,3) NOT NULL, "reason" text NOT NULL, "moved_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_stock_movements_quantity" CHECK ("quantity" > 0), CONSTRAINT "CHK_stock_movements_type" CHECK ("type" IN ('inbound', 'outbound')), CONSTRAINT "PK_stock_movements" PRIMARY KEY ("stock_movement_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_inventory_item_id" ON "stock_movements" ("inventory_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_employee_id" ON "stock_movements" ("employee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_moved_at" ON "stock_movements" ("moved_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "site_settings" ("site_setting_id" uuid NOT NULL DEFAULT gen_random_uuid(), "visual_published" jsonb, "visual_draft" jsonb, "is_estimator_enabled" boolean NOT NULL DEFAULT true, "negotiation_margin" numeric(5,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_site_settings_negotiation_margin" CHECK ("negotiation_margin" >= 0 AND "negotiation_margin" <= 100), CONSTRAINT "PK_site_settings" PRIMARY KEY ("site_setting_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "commission_rules" ("commission_rule_id" uuid NOT NULL DEFAULT gen_random_uuid(), "employee_id" uuid, "min_total" numeric(12,2), "max_total" numeric(12,2), "type" character varying(20) NOT NULL, "value" numeric(12,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_commission_rules_value" CHECK ("value" > 0 AND ("type" <> 'percentage' OR "value" <= 100)), CONSTRAINT "CHK_commission_rules_total_range" CHECK ("min_total" IS NULL OR "max_total" IS NULL OR "min_total" <= "max_total"), CONSTRAINT "CHK_commission_rules_type" CHECK ("type" IN ('percentage', 'fixed')), CONSTRAINT "PK_commission_rules" PRIMARY KEY ("commission_rule_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commission_rules_employee_id" ON "commission_rules" ("employee_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "customers" ("customer_id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(20) NOT NULL, "name" character varying(150) NOT NULL, "document" character varying(14) NOT NULL, "email" character varying(254) NOT NULL, "phone" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_customers_type" CHECK ("type" IN ('individual', 'business')), CONSTRAINT "PK_customers" PRIMARY KEY ("customer_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_customers_document" ON "customers" ("document") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "quotes" ("quote_id" uuid NOT NULL DEFAULT gen_random_uuid(), "customer_id" uuid NOT NULL, "source" character varying(20) NOT NULL, "pdf_url" text, "status" character varying(20) NOT NULL DEFAULT 'requested', "min_price" numeric(12,2), "max_price" numeric(12,2), "final_price" numeric(12,2), "sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_quotes_price_range" CHECK ("min_price" IS NULL OR "max_price" IS NULL OR "min_price" <= "max_price"), CONSTRAINT "CHK_quotes_status" CHECK ("status" IN ('requested', 'sent', 'approved', 'rejected')), CONSTRAINT "CHK_quotes_source" CHECK ("source" IN ('pdf', 'estimator')), CONSTRAINT "PK_quotes" PRIMARY KEY ("quote_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotes_customer_id" ON "quotes" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_orders" ("service_order_id" uuid NOT NULL DEFAULT gen_random_uuid(), "customer_id" uuid NOT NULL, "quote_id" uuid, "seller_employee_id" uuid NOT NULL, "commission_rule_id" uuid, "total" numeric(12,2) NOT NULL, "commission" numeric(12,2) NOT NULL, "sold_at" TIMESTAMP WITH TIME ZONE NOT NULL, "tracking_code" character(8) NOT NULL, "scope" text NOT NULL, "due_date" date NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'queued', "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_service_orders_commission" CHECK ("commission" >= 0), CONSTRAINT "CHK_service_orders_total" CHECK ("total" >= 0), CONSTRAINT "CHK_service_orders_status" CHECK ("status" IN ('queued', 'in_production', 'finishing', 'completed')), CONSTRAINT "PK_service_orders" PRIMARY KEY ("service_order_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_customer_id" ON "service_orders" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_service_orders_quote_id" ON "service_orders" ("quote_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_seller_employee_id" ON "service_orders" ("seller_employee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_commission_rule_id" ON "service_orders" ("commission_rule_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_service_orders_tracking_code" ON "service_orders" ("tracking_code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "paint_types" ("paint_type_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "price_per_m2" numeric(10,2) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_paint_types" PRIMARY KEY ("paint_type_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "part_materials" ("part_material_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "price_factor" numeric(6,3) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_part_materials_price_factor" CHECK ("price_factor" > 0), CONSTRAINT "PK_part_materials" PRIMARY KEY ("part_material_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quote_items" ("quote_item_id" uuid NOT NULL DEFAULT gen_random_uuid(), "quote_id" uuid NOT NULL, "part_material_id" uuid NOT NULL, "paint_type_id" uuid NOT NULL, "area_m2" numeric(10,3) NOT NULL, "quantity" integer NOT NULL, "price_per_m2" numeric(10,2) NOT NULL, "price_factor" numeric(6,3) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_quote_items_quantity" CHECK ("quantity" > 0), CONSTRAINT "CHK_quote_items_area_m2" CHECK ("area_m2" > 0), CONSTRAINT "PK_quote_items" PRIMARY KEY ("quote_item_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_items_quote_id" ON "quote_items" ("quote_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_items_part_material_id" ON "quote_items" ("part_material_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_items_paint_type_id" ON "quote_items" ("paint_type_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "portfolio_categories" ("portfolio_category_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "position" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_portfolio_categories" PRIMARY KEY ("portfolio_category_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_portfolio_categories_name" ON "portfolio_categories" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "portfolio_projects" ("portfolio_project_id" uuid NOT NULL DEFAULT gen_random_uuid(), "portfolio_category_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "description" text NOT NULL, "service_type" character varying(150) NOT NULL, "materials" character varying(255) NOT NULL, "cover_url" text NOT NULL, "before_url" text, "after_url" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_portfolio_projects" PRIMARY KEY ("portfolio_project_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portfolio_projects_portfolio_category_id" ON "portfolio_projects" ("portfolio_category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "contact_requests" ("contact_request_id" uuid NOT NULL DEFAULT gen_random_uuid(), "customer_id" uuid, "name" character varying(150) NOT NULL, "email" character varying(254) NOT NULL, "phone" character varying(20) NOT NULL, "message" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'new', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_contact_requests_status" CHECK ("status" IN ('new', 'handled')), CONSTRAINT "PK_contact_requests" PRIMARY KEY ("contact_request_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contact_requests_customer_id" ON "contact_requests" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "company_events" ("company_event_id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(150) NOT NULL, "description" text NOT NULL, "event_date" date NOT NULL, "image_url" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_company_events" PRIMARY KEY ("company_event_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_inventory_items_inventory_category_id" FOREIGN KEY ("inventory_category_id") REFERENCES "inventory_categories"("inventory_category_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_inventory_items_supplier_id" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_inventory_item_id" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_rules" ADD CONSTRAINT "FK_commission_rules_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_quotes_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_service_orders_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_service_orders_quote_id" FOREIGN KEY ("quote_id") REFERENCES "quotes"("quote_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_service_orders_seller_employee_id" FOREIGN KEY ("seller_employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_service_orders_commission_rule_id" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("commission_rule_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_items" ADD CONSTRAINT "FK_quote_items_quote_id" FOREIGN KEY ("quote_id") REFERENCES "quotes"("quote_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_items" ADD CONSTRAINT "FK_quote_items_part_material_id" FOREIGN KEY ("part_material_id") REFERENCES "part_materials"("part_material_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_items" ADD CONSTRAINT "FK_quote_items_paint_type_id" FOREIGN KEY ("paint_type_id") REFERENCES "paint_types"("paint_type_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio_projects" ADD CONSTRAINT "FK_portfolio_projects_portfolio_category_id" FOREIGN KEY ("portfolio_category_id") REFERENCES "portfolio_categories"("portfolio_category_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_requests" ADD CONSTRAINT "FK_contact_requests_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contact_requests" DROP CONSTRAINT "FK_contact_requests_customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio_projects" DROP CONSTRAINT "FK_portfolio_projects_portfolio_category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_items" DROP CONSTRAINT "FK_quote_items_paint_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_items" DROP CONSTRAINT "FK_quote_items_part_material_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_items" DROP CONSTRAINT "FK_quote_items_quote_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_service_orders_commission_rule_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_service_orders_seller_employee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_service_orders_quote_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_service_orders_customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_quotes_customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_rules" DROP CONSTRAINT "FK_commission_rules_employee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_employee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_inventory_item_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_inventory_items_supplier_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_inventory_items_inventory_category_id"`,
    );
    await queryRunner.query(`DROP TABLE "company_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_contact_requests_customer_id"`,
    );
    await queryRunner.query(`DROP TABLE "contact_requests"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_portfolio_projects_portfolio_category_id"`,
    );
    await queryRunner.query(`DROP TABLE "portfolio_projects"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_portfolio_categories_name"`,
    );
    await queryRunner.query(`DROP TABLE "portfolio_categories"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_quote_items_paint_type_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_quote_items_part_material_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_quote_items_quote_id"`);
    await queryRunner.query(`DROP TABLE "quote_items"`);
    await queryRunner.query(`DROP TABLE "part_materials"`);
    await queryRunner.query(`DROP TABLE "paint_types"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_service_orders_tracking_code"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_commission_rule_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_seller_employee_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_service_orders_quote_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_customer_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_orders"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_quotes_customer_id"`);
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_customers_document"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_rules_employee_id"`,
    );
    await queryRunner.query(`DROP TABLE "commission_rules"`);
    await queryRunner.query(`DROP TABLE "site_settings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_moved_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_employee_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_inventory_item_id"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_inventory_items_supplier_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_inventory_items_inventory_category_id"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inventory_categories_name"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_categories"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_employees_email"`);
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
  }
}
