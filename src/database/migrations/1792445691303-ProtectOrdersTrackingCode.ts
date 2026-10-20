import { MigrationInterface, QueryRunner } from 'typeorm';

// The tracking code generated at sale time is immutable (ADR 0001): once set,
// it cannot be updated or cleared.
export class ProtectOrdersTrackingCode1792445691303 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION protect_orders_tracking_code()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.tracking_code IS NOT NULL AND NEW.tracking_code IS DISTINCT FROM OLD.tracking_code THEN
          RAISE EXCEPTION 'tracking_code is immutable once set';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER "TRG_orders_tracking_code_immutable"
      BEFORE UPDATE ON "orders"
      FOR EACH ROW
      EXECUTE FUNCTION protect_orders_tracking_code();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "TRG_orders_tracking_code_immutable" ON "orders";
      DROP FUNCTION IF EXISTS protect_orders_tracking_code();
    `);
  }
}
