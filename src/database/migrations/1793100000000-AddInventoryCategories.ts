import { MigrationInterface, QueryRunner } from 'typeorm';

// Turns the free-text category of the inventory items into a table the
// administrator manages (US13). Written by hand because it moves data:
// every distinct category already in use becomes a row, and each item points
// to its row. Names that differ only in case become one category.
export class AddInventoryCategories1793100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory_categories" (
        "inventory_category_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_inventory_categories" PRIMARY KEY ("inventory_category_id")
      );
      CREATE UNIQUE INDEX "UQ_inventory_categories_name" ON "inventory_categories" (LOWER("name")) WHERE "deleted_at" IS NULL;
      INSERT INTO "inventory_categories" ("name")
        SELECT DISTINCT ON (LOWER("category")) "category"
          FROM "inventory_items"
         ORDER BY LOWER("category"), "category";
      ALTER TABLE "inventory_items" ADD "category_id" uuid;
      UPDATE "inventory_items" AS item
         SET "category_id" = category."inventory_category_id"
        FROM "inventory_categories" AS category
       WHERE LOWER(category."name") = LOWER(item."category");
      ALTER TABLE "inventory_items" ALTER COLUMN "category_id" SET NOT NULL;
      ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_inventory_items_category_id" FOREIGN KEY ("category_id") REFERENCES "inventory_categories"("inventory_category_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      CREATE INDEX "IDX_inventory_items_category_id" ON "inventory_items" ("category_id");
      DROP INDEX "IDX_inventory_items_category";
      ALTER TABLE "inventory_items" DROP COLUMN "category";
    `);
  }

  // The name of each item's category goes back to the text column. Removed
  // categories keep their name, so nothing is lost.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory_items" ADD "category" character varying(100);
      UPDATE "inventory_items" AS item
         SET "category" = category."name"
        FROM "inventory_categories" AS category
       WHERE category."inventory_category_id" = item."category_id";
      ALTER TABLE "inventory_items" ALTER COLUMN "category" SET NOT NULL;
      CREATE INDEX "IDX_inventory_items_category" ON "inventory_items" ("category");
      DROP INDEX "IDX_inventory_items_category_id";
      ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_inventory_items_category_id";
      ALTER TABLE "inventory_items" DROP COLUMN "category_id";
      DROP TABLE "inventory_categories";
    `);
  }
}
