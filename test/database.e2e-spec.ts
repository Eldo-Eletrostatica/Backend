import { DataSource, QueryRunner } from 'typeorm';
import { createTypeOrmOptions } from '../src/database/typeorm.config';

const INSERT_SQL_BY_TABLE: Record<string, (value: string) => string> = {
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
    ['catalog_items', 'catalog_item_id'],
    ['orders', 'order_id'],
    ['order_items', 'order_item_id'],
    ['inventory_items', 'inventory_item_id'],
    ['stock_movements', 'stock_movement_id'],
    ['showcase_items', 'showcase_item_id'],
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
    await queryRunner.query(INSERT_SQL_BY_TABLE[table](value));
    await expect(
      queryRunner.query(INSERT_SQL_BY_TABLE[table](value)),
    ).rejects.toThrow(/UQ_/);
  });

  it.each([
    ['employees', 'ana@eldo.com'],
    ['customers', '12345678000199'],
  ])(
    '%s aceita reaproveitar %s depois da exclusão lógica',
    async (table, value) => {
      await queryRunner.query(INSERT_SQL_BY_TABLE[table](value));
      await queryRunner.query(`UPDATE ${table} SET deleted_at = now()`);
      await expect(
        queryRunner.query(INSERT_SQL_BY_TABLE[table](value)),
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

  it.each([
    [
      'cliente PJ sem CNPJ',
      `INSERT INTO customers (type, name, email, phone) VALUES ('business', 'ACME', 'contato@acme.com', '61999999999')`,
    ],
    [
      'tipo de pintura com fator de material',
      `INSERT INTO catalog_items (type, name, price_per_m2, price_factor) VALUES ('paintType', 'Epóxi', 50, 1.2)`,
    ],
    [
      'material sem fator',
      `INSERT INTO catalog_items (type, name) VALUES ('partMaterial', 'Aço')`,
    ],
    [
      'comissão sem tipo',
      `INSERT INTO employees (name, email, password_hash, commission_value) VALUES ('Ana', 'b@eldo.com', 'hash', 5)`,
    ],
    [
      'pedido em produção sem dados da venda',
      `INSERT INTO orders (customer_id, source, status) SELECT customer_id, 'internal', 'queued' FROM customers`,
    ],
  ])('rejeita %s', async (_case, sql) => {
    await queryRunner.query(INSERT_SQL_BY_TABLE.customers('12345678000199'));
    await expect(queryRunner.query(sql)).rejects.toThrow(/CHK_/);
  });

  it.each([
    [
      'cliente PF sem CPF vindo do contato',
      `INSERT INTO customers (type, name, email, phone) VALUES ('individual', 'Bia', 'bia@email.com', '61988888888')`,
    ],
    [
      'pedido de contato sem dados da venda',
      `INSERT INTO orders (customer_id, source, customer_message) SELECT customer_id, 'contact', 'Quero pintar um portão' FROM customers`,
    ],
  ])('aceita %s', async (_case, sql) => {
    await queryRunner.query(INSERT_SQL_BY_TABLE.customers('12345678000199'));
    await expect(queryRunner.query(sql)).resolves.toBeDefined();
  });

  it.each([
    [
      'alteração do protocolo para outro código',
      `UPDATE orders SET tracking_code = 'XYZ98765'`,
    ],
    ['remoção do protocolo com NULL', `UPDATE orders SET tracking_code = NULL`],
  ])('rejeita %s após preenchido', async (_case, updateSql) => {
    await queryRunner.query(INSERT_SQL_BY_TABLE.employees('vendedor@eldo.com'));
    await queryRunner.query(INSERT_SQL_BY_TABLE.customers('12345678000199'));
    await queryRunner.query(`
      INSERT INTO orders (customer_id, seller_employee_id, source, status, final_price, commission, sold_at, tracking_code, scope, due_date)
      SELECT c.customer_id, e.employee_id, 'internal', 'queued', 1000, 50, now(), 'ABC12345', 'Pintura', '2030-01-01'
        FROM customers c, employees e
    `);
    await expect(queryRunner.query(updateSql)).rejects.toThrow(
      /tracking_code is immutable once set/,
    );
  });
});
