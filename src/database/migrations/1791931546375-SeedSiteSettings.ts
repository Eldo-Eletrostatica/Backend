import { MigrationInterface, QueryRunner } from 'typeorm';

// site_settings holds a single row; the app only reads and updates it.
export class SeedSiteSettings1791931546375 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO "site_settings" DEFAULT VALUES`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "site_settings"`);
  }
}
