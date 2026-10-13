import { DataSource, QueryRunner } from 'typeorm';
import { createTypeOrmOptions } from '../src/database/typeorm.config';

const insertRow: Record<string, (value: string) => string> = {
  employees: (email) =>
    `INSERT INTO employees (name, email, password_hash) VALUES ('Ana', '${email}', 'hash')`,
  customers: (document) =>
    `INSERT INTO customers (type, name, document, email, phone) VALUES ('business', 'ACME', '${document}', 'contato@acme.com', '61999999999')`,
};

describe('Schema do banco (e2e)', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  beforeAll(async () => {
    dataSource = await new DataSource(
      createTypeOrmOptions(process.env),
    ).initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  // Every test runs inside a transaction that is rolled back, so the
  // development database is left as it was.
  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it.each([
    ['employees'],
    ['customers'],
    ['contact_requests'],
    ['paint_types'],
    ['part_materials'],
    ['quotes'],
    ['quote_items'],
    ['commission_rules'],
    ['service_orders'],
    ['inventory_categories'],
    ['suppliers'],
    ['inventory_items'],
    ['stock_movements'],
    ['portfolio_categories'],
    ['portfolio_projects'],
    ['company_events'],
    ['site_settings'],
  ])('cria a tabela %s', async (table) => {
    const rows = (await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    )) as unknown[];
    expect(rows).toHaveLength(1);
  });

  it('cria o registro único de configurações do site', async () => {
    const rows = (await queryRunner.query(
      'SELECT COUNT(*) AS count FROM site_settings',
    )) as { count: string }[];
    expect(Number(rows[0].count)).toBe(1);
  });

  it.each([
    ['employees', 'ana@eldo.com'],
    ['customers', '12345678000199'],
  ])('%s rejeita %s repetido entre registros ativos', async (table, value) => {
    await queryRunner.query(insertRow[table](value));
    await expect(queryRunner.query(insertRow[table](value))).rejects.toThrow(
      /UQ_/,
    );
  });

  it.each([
    ['employees', 'ana@eldo.com'],
    ['customers', '12345678000199'],
  ])(
    '%s aceita reaproveitar %s depois da exclusão lógica',
    async (table, value) => {
      await queryRunner.query(insertRow[table](value));
      await queryRunner.query(`UPDATE ${table} SET deleted_at = now()`);
      await expect(
        queryRunner.query(insertRow[table](value)),
      ).resolves.toBeDefined();
    },
  );

  it.each([
    [
      'employees',
      `INSERT INTO employees (name, email, password_hash, role) VALUES ('Ana', 'a@eldo.com', 'hash', 'owner')`,
    ],
    [
      'stock_movements',
      `INSERT INTO stock_movements (inventory_item_id, employee_id, type, quantity, reason, moved_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'transfer', 1, 'x', now())`,
    ],
  ])('%s rejeita valor fora do enum', async (_table, sql) => {
    await expect(queryRunner.query(sql)).rejects.toThrow(/CHK_/);
  });
});
