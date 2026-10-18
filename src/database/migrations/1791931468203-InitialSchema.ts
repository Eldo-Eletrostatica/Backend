import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791931468203 implements MigrationInterface {
  name = 'InitialSchema1791931468203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "employees" ("employee_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(120) NOT NULL, "email" character varying(254) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'employee', "commission_type" character varying(20), "commission_value" numeric(12,2), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_employees_commission_value" CHECK ("commission_value" > 0 AND ("commission_type" <> 'percentage' OR "commission_value" <= 100)), CONSTRAINT "CHK_employees_commission_pair" CHECK (("commission_type" IS NULL) = ("commission_value" IS NULL)), CONSTRAINT "CHK_employees_commission_type" CHECK ("commission_type" IN ('percentage', 'fixed')), CONSTRAINT "CHK_employees_role" CHECK ("role" IN ('admin', 'manager', 'employee')), CONSTRAINT "PK_employees" PRIMARY KEY ("employee_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_employees_email" ON "employees" ("email") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_items" ("inventory_item_id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(150) NOT NULL, "category" character varying(100) NOT NULL, "supplier_name" character varying(150) NOT NULL, "unit" character varying(20) NOT NULL, "balance" numeric(12,3) NOT NULL DEFAULT '0', "minimum_stock" numeric(12,3) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_inventory_items_minimum_stock" CHECK ("minimum_stock" >= 0), CONSTRAINT "CHK_inventory_items_balance" CHECK ("balance" >= 0), CONSTRAINT "CHK_inventory_items_unit" CHECK ("unit" IN ('kg', 'liter', 'unit')), CONSTRAINT "PK_inventory_items" PRIMARY KEY ("inventory_item_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_items_category" ON "inventory_items" ("category") `,
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
      `CREATE TABLE "showcase_items" ("showcase_item_id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(20) NOT NULL, "title" character varying(150) NOT NULL, "description" text NOT NULL, "image_url" text NOT NULL, "category" character varying(100), "service_type" character varying(150), "materials" character varying(255), "before_url" text, "after_url" text, "event_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_showcase_items_company_event" CHECK ("type" <> 'companyEvent' OR "event_date" IS NOT NULL), CONSTRAINT "CHK_showcase_items_portfolio_project" CHECK ("type" <> 'portfolioProject' OR ("category" IS NOT NULL AND "service_type" IS NOT NULL AND "materials" IS NOT NULL)), CONSTRAINT "CHK_showcase_items_type" CHECK ("type" IN ('portfolioProject', 'companyEvent')), CONSTRAINT "PK_showcase_items" PRIMARY KEY ("showcase_item_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_showcase_items_type" ON "showcase_items" ("type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "customers" ("customer_id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(20) NOT NULL, "name" character varying(150) NOT NULL, "document" character varying(14), "email" character varying(254) NOT NULL, "phone" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_customers_document" CHECK ("type" <> 'business' OR "document" IS NOT NULL), CONSTRAINT "CHK_customers_type" CHECK ("type" IN ('individual', 'business')), CONSTRAINT "PK_customers" PRIMARY KEY ("customer_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_customers_document" ON "customers" ("document") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("order_id" uuid NOT NULL DEFAULT gen_random_uuid(), "customer_id" uuid NOT NULL, "seller_employee_id" uuid, "source" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'requested', "customer_message" text, "pdf_url" text, "min_price" numeric(12,2), "max_price" numeric(12,2), "final_price" numeric(12,2), "sent_at" TIMESTAMP WITH TIME ZONE, "commission" numeric(12,2), "sold_at" TIMESTAMP WITH TIME ZONE, "tracking_code" character(8), "scope" text, "due_date" date, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_orders_sale" CHECK ("status" NOT IN ('queued', 'inProduction', 'finishing', 'completed') OR ("seller_employee_id" IS NOT NULL AND "final_price" IS NOT NULL AND "commission" IS NOT NULL AND "sold_at" IS NOT NULL AND "tracking_code" IS NOT NULL AND "scope" IS NOT NULL AND "due_date" IS NOT NULL)), CONSTRAINT "CHK_orders_commission" CHECK ("commission" >= 0), CONSTRAINT "CHK_orders_final_price" CHECK ("final_price" >= 0), CONSTRAINT "CHK_orders_price_range" CHECK ("min_price" IS NULL OR "max_price" IS NULL OR "min_price" <= "max_price"), CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('requested', 'sent', 'approved', 'rejected', 'queued', 'inProduction', 'finishing', 'completed')), CONSTRAINT "CHK_orders_source" CHECK ("source" IN ('contact', 'pdf', 'estimator', 'internal')), CONSTRAINT "PK_orders" PRIMARY KEY ("order_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_customer_id" ON "orders" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_seller_employee_id" ON "orders" ("seller_employee_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_orders_tracking_code" ON "orders" ("tracking_code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog_items" ("catalog_item_id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "price_per_m2" numeric(10,2), "price_factor" numeric(6,3), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_catalog_items_price" CHECK (("type" = 'paintType' AND "price_per_m2" IS NOT NULL AND "price_per_m2" > 0 AND "price_factor" IS NULL) OR ("type" = 'partMaterial' AND "price_factor" IS NOT NULL AND "price_factor" > 0 AND "price_per_m2" IS NULL)), CONSTRAINT "CHK_catalog_items_type" CHECK ("type" IN ('paintType', 'partMaterial')), CONSTRAINT "PK_catalog_items" PRIMARY KEY ("catalog_item_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("order_item_id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "material_catalog_item_id" uuid NOT NULL, "paint_catalog_item_id" uuid NOT NULL, "area_m2" numeric(10,3) NOT NULL, "quantity" integer NOT NULL, "price_per_m2" numeric(10,2) NOT NULL, "price_factor" numeric(6,3) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_order_items_quantity" CHECK ("quantity" > 0), CONSTRAINT "CHK_order_items_area_m2" CHECK ("area_m2" > 0), CONSTRAINT "PK_order_items" PRIMARY KEY ("order_item_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_material_catalog_item_id" ON "order_items" ("material_catalog_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_paint_catalog_item_id" ON "order_items" ("paint_catalog_item_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_inventory_item_id" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_seller_employee_id" FOREIGN KEY ("seller_employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_material_catalog_item_id" FOREIGN KEY ("material_catalog_item_id") REFERENCES "catalog_items"("catalog_item_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_paint_catalog_item_id" FOREIGN KEY ("paint_catalog_item_id") REFERENCES "catalog_items"("catalog_item_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_paint_catalog_item_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_material_catalog_item_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_seller_employee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_employee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_inventory_item_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_order_items_paint_catalog_item_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_order_items_material_catalog_item_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_order_items_order_id"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "catalog_items"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_orders_tracking_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_orders_seller_employee_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_customer_id"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_customers_document"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_showcase_items_type"`);
    await queryRunner.query(`DROP TABLE "showcase_items"`);
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
      `DROP INDEX "public"."IDX_inventory_items_category"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_items"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_employees_email"`);
    await queryRunner.query(`DROP TABLE "employees"`);
  }
}
