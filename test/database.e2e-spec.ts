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
    ['employees', 'employee_id'],
    ['customers', 'customer_id'],
    ['contact_requests', 'contact_request_id'],
    ['paint_types', 'paint_type_id'],
    ['part_materials', 'part_material_id'],
    ['quotes', 'quote_id'],
    ['quote_items', 'quote_item_id'],
    ['commission_rules', 'commission_rule_id'],
    ['service_orders', 'service_order_id'],
    ['inventory_categories', 'inventory_category_id'],
    ['suppliers', 'supplier_id'],
    ['inventory_items', 'inventory_item_id'],
    ['stock_movements', 'stock_movement_id'],
    ['portfolio_categories', 'portfolio_category_id'],
    ['portfolio_projects', 'portfolio_project_id'],
    ['company_events', 'company_event_id'],
    ['site_settings', 'site_setting_id'],
  ])('cria a tabela %s com a PK %s', async (table, primaryKey) => {
    const rows = (await queryRunner.query(
      `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'`,
      [table],
    )) as { column_name: string }[];
    expect(rows).toEqual([{ column_name: primaryKey }]);
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
