import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds the handled status of a contact request (US06). TypeORM compares CHECK
// constraints only by name, so it does not see the new value in the enum and
// this migration is written by hand.
export class AddHandledOrderStatus1792958818876 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status";
      ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('requested', 'handled', 'sent', 'approved', 'rejected', 'queued', 'inProduction', 'finishing', 'completed'));
    `);
  }

  // A handled contact request goes back to requested, the only status the old
  // constraint has for it.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "orders" SET "status" = 'requested' WHERE "status" = 'handled';
      ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status";
      ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('requested', 'sent', 'approved', 'rejected', 'queued', 'inProduction', 'finishing', 'completed'));
    `);
  }
}
