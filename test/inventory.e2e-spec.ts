import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MAX_STOCK_QUANTITY } from '../src/database/columns';
import { InventoryUnit } from '../src/inventory-items/entities/inventory-item.entity';
import { StockMovementResponseDto } from '../src/stock-movements/dto/stock-movement-response.dto';

type InventoryItemResponse = {
  inventoryItemId: string;
  name: string;
  category: string;
  supplierName: string;
  unit: string;
  balance: number;
  minimumStock: number;
  hasPossibleDuplicate?: boolean;
};

describe('Estoque (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let employeeId: string;

  const created = {
    inventoryItemIds: [] as string[],
    employeeIds: [] as string[],
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM stock_movements');
    await dataSource.query('DELETE FROM inventory_items');
    employeeId = await insertEmployee();
  });

  afterEach(async () => {
    await dataSource.query(
      `DELETE FROM stock_movements
        WHERE inventory_item_id = ANY($1) OR employee_id = ANY($2)`,
      [created.inventoryItemIds, created.employeeIds],
    );
    await dataSource.query(
      'DELETE FROM inventory_items WHERE inventory_item_id = ANY($1)',
      [created.inventoryItemIds],
    );
    await dataSource.query(
      'DELETE FROM employees WHERE employee_id = ANY($1)',
      [created.employeeIds],
    );
    created.inventoryItemIds.length = 0;
    created.employeeIds.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  async function insertEmployee(): Promise<string> {
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash)
       VALUES ('Ana', $1, 'hash') RETURNING employee_id`,
      [`${randomUUID()}@eldo.test`],
    );
    created.employeeIds.push(rows[0].employee_id);
    return rows[0].employee_id;
  }

  function createItem(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/inventory-items')
      .send({
        name: 'Tinta preta',
        category: 'Tintas',
        supplierName: 'Fornecedor',
        unit: InventoryUnit.Liter,
        balance: 10,
        minimumStock: 2,
        ...overrides,
      });
  }

  async function createdItem(
    overrides: Record<string, unknown> = {},
  ): Promise<InventoryItemResponse> {
    const response = await createItem(overrides).expect(201);
    const item = response.body as InventoryItemResponse;
    created.inventoryItemIds.push(item.inventoryItemId);
    return item;
  }

  function moveStock(
    inventoryItemId: string,
    type: 'inbound' | 'outbound',
    quantity: number,
    reason = type === 'inbound' ? 'Compra' : 'Produção',
  ) {
    return request(app.getHttpServer()).post('/stock-movements').send({
      inventoryItemId,
      employeeId,
      type,
      quantity,
      reason,
    });
  }

  it('cria, consulta, atualiza e remove logicamente um item', async () => {
    const createdResponse = await createdItem();
    expect(createdResponse).toMatchObject({
      name: 'Tinta preta',
      category: 'Tintas',
      supplierName: 'Fornecedor',
      unit: 'liter',
      balance: 10,
      minimumStock: 2,
      hasPossibleDuplicate: false,
    });

    const found = await request(app.getHttpServer())
      .get(`/inventory-items/${createdResponse.inventoryItemId}`)
      .expect(200);
    expect((found.body as InventoryItemResponse).category).toBe('Tintas');

    const updated = await request(app.getHttpServer())
      .patch(`/inventory-items/${createdResponse.inventoryItemId}`)
      .send({ minimumStock: 4, category: 'Insumos' })
      .expect(200);
    expect(updated.body as InventoryItemResponse).toMatchObject({
      minimumStock: 4,
      category: 'Insumos',
      supplierName: 'Fornecedor',
    });

    await request(app.getHttpServer())
      .delete(`/inventory-items/${createdResponse.inventoryItemId}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/inventory-items/${createdResponse.inventoryItemId}`)
      .expect(404);
    const list = await request(app.getHttpServer())
      .get('/inventory-items')
      .expect(200);
    expect(list.body as InventoryItemResponse[]).toEqual([]);
  });

  it('remove espaços das pontas dos textos do item', async () => {
    const item = await createdItem({
      name: '  Tinta preta  ',
      category: '  Tintas  ',
      supplierName: '  Fornecedor  ',
    });

    expect(item).toMatchObject({
      name: 'Tinta preta',
      category: 'Tintas',
      supplierName: 'Fornecedor',
    });
  });

  it.each([
    ['nome', { name: null }],
    ['categoria', { category: null }],
    ['fornecedor', { supplierName: null }],
    ['unidade', { unit: null }],
    ['estoque mínimo', { minimumStock: null }],
  ])('rejeita a atualização com %s nulo com 400', async (_label, body) => {
    const item = await createdItem();

    await request(app.getHttpServer())
      .patch(`/inventory-items/${item.inventoryItemId}`)
      .send(body)
      .expect(400);

    const stored = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect(stored.body as InventoryItemResponse).toMatchObject({
      name: 'Tinta preta',
      category: 'Tintas',
      supplierName: 'Fornecedor',
      unit: 'liter',
      minimumStock: 2,
    });
  });

  it.each([
    ['kg', InventoryUnit.Kilogram],
    ['liter', InventoryUnit.Liter],
    ['unit', InventoryUnit.Unit],
  ])('aceita a unidade %s', async (_label, unit) => {
    const item = await createdItem({ unit, name: `Item ${unit}` });
    expect(item.unit).toBe(unit);
  });

  it('avisa sobre item com nome possivelmente duplicado sem bloquear o cadastro', async () => {
    await createdItem();
    const duplicate = await createdItem({ name: 'tinta preta' });
    expect(duplicate.hasPossibleDuplicate).toBe(true);
  });

  it.each([
    ['sem categoria', { category: '' }],
    ['sem fornecedor', { supplierName: '  ' }],
    ['com unidade inválida', { unit: 'metro' }],
    ['com saldo negativo', { balance: -1 }],
  ])('rejeita item %s com 400', async (_label, overrides) => {
    await createItem(overrides).expect(400);
  });

  it('registra entrada e saída atualizando o saldo', async () => {
    const item = await createdItem();
    await moveStock(item.inventoryItemId, 'inbound', 3).expect(201);
    await moveStock(item.inventoryItemId, 'outbound', 4).expect(201);
    const response = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect((response.body as InventoryItemResponse).balance).toBe(9);
  });

  it('rejeita saída maior que o saldo sem alterar o item', async () => {
    const item = await createdItem({ balance: 2 });
    const response = await moveStock(
      item.inventoryItemId,
      'outbound',
      3,
    ).expect(409);
    expect((response.body as { message: string }).message).toBe(
      'Saldo insuficiente.',
    );
    const stored = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect((stored.body as InventoryItemResponse).balance).toBe(2);
  });

  it('aceita entrada que deixa o saldo exatamente no teto', async () => {
    const item = await createdItem({ balance: MAX_STOCK_QUANTITY - 1 });

    await moveStock(item.inventoryItemId, 'inbound', 1).expect(201);

    const stored = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect((stored.body as InventoryItemResponse).balance).toBe(
      MAX_STOCK_QUANTITY,
    );
  });

  it('rejeita entrada acima do saldo máximo sem alterar o item', async () => {
    const item = await createdItem({ balance: MAX_STOCK_QUANTITY });

    const response = await moveStock(item.inventoryItemId, 'inbound', 1).expect(
      409,
    );
    expect((response.body as { message: string }).message).toBe(
      'Saldo máximo excedido.',
    );

    const stored = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect((stored.body as InventoryItemResponse).balance).toBe(
      MAX_STOCK_QUANTITY,
    );
    const history = await request(app.getHttpServer())
      .get('/stock-movements')
      .query({
        from: '2000-01-01',
        to: '2999-12-31',
        inventoryItemId: item.inventoryItemId,
      })
      .expect(200);
    expect(history.body as StockMovementResponseDto[]).toEqual([]);
  });

  it.each([
    ['o item', 'item'],
    ['o funcionário', 'employee'],
  ])('responde 404 quando %s não existe', async (_label, missing) => {
    const item = await createdItem();
    const response = await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        inventoryItemId:
          missing === 'item' ? randomUUID() : item.inventoryItemId,
        employeeId: missing === 'employee' ? randomUUID() : employeeId,
        type: 'inbound',
        quantity: 1,
        reason: 'Compra',
      })
      .expect(404);
    expect((response.body as { message: string }).message).toBe(
      missing === 'item'
        ? 'Item não encontrado.'
        : 'Funcionário não encontrado.',
    );
  });

  it('lista itens no limite mínimo e remove o alerta após entrada', async () => {
    const item = await createdItem({ balance: 2, minimumStock: 2 });
    const lowStock = await request(app.getHttpServer())
      .get('/inventory-items/low-stock')
      .expect(200);
    expect(lowStock.body as InventoryItemResponse[]).toEqual([
      expect.objectContaining({ inventoryItemId: item.inventoryItemId }),
    ]);
    const count = await request(app.getHttpServer())
      .get('/inventory-items/low-stock/count')
      .expect(200);
    expect((count.body as { count: number }).count).toBe(1);

    await moveStock(item.inventoryItemId, 'inbound', 1).expect(201);

    const empty = await request(app.getHttpServer())
      .get('/inventory-items/low-stock')
      .expect(200);
    expect(empty.body as InventoryItemResponse[]).toEqual([]);
    const emptyCount = await request(app.getHttpServer())
      .get('/inventory-items/low-stock/count')
      .expect(200);
    expect((emptyCount.body as { count: number }).count).toBe(0);
  });

  it('consulta movimentações em um período sem expor a senha', async () => {
    const item = await createdItem();
    await moveStock(item.inventoryItemId, 'inbound', 1, '  Compra  ').expect(
      201,
    );
    const response = await request(app.getHttpServer())
      .get('/stock-movements')
      .query({
        from: '2000-01-01',
        to: '2999-12-31',
        inventoryItemId: item.inventoryItemId,
      })
      .expect(200);
    const movements = response.body as StockMovementResponseDto[];
    expect(movements).toHaveLength(1);
    expect(movements[0].employee.name).toBe('Ana');
    expect(movements[0].employee).not.toHaveProperty('passwordHash');
    expect(movements[0].quantity).toBe(1);
    expect(movements[0].reason).toBe('Compra');
  });

  it.each([
    ['às 22h', '2026-10-02T01:00:00.000Z', '2026-10-01', '2026-10-02'],
    ['às 23h59', '2026-10-02T02:59:59.999Z', '2026-10-01', '2026-10-02'],
    ['à meia-noite', '2026-10-02T03:00:00.000Z', '2026-10-02', '2026-10-01'],
  ])(
    'associa a movimentação de %s ao dia correto em Brasília',
    async (_label, movedAt, expectedDay, otherDay) => {
      const item = await createdItem();
      const movementResponse = await moveStock(
        item.inventoryItemId,
        'inbound',
        1,
      ).expect(201);
      const movement = movementResponse.body as StockMovementResponseDto;
      await dataSource.query(
        'UPDATE stock_movements SET moved_at = $1 WHERE stock_movement_id = $2',
        [movedAt, movement.stockMovementId],
      );

      const sameDay = await request(app.getHttpServer())
        .get('/stock-movements')
        .query({
          from: expectedDay,
          to: expectedDay,
          inventoryItemId: item.inventoryItemId,
        })
        .expect(200);
      expect(
        (sameDay.body as StockMovementResponseDto[]).map(
          (found) => found.stockMovementId,
        ),
      ).toEqual([movement.stockMovementId]);

      const previousDay = await request(app.getHttpServer())
        .get('/stock-movements')
        .query({
          from: otherDay,
          to: otherDay,
          inventoryItemId: item.inventoryItemId,
        })
        .expect(200);
      expect(previousDay.body as StockMovementResponseDto[]).toEqual([]);
    },
  );

  it.each([
    ['com o fim antes do início', { from: '2026-02-01', to: '2026-01-01' }],
    ['com data inválida', { from: '2026-02-31', to: '2026-03-01' }],
  ])('rejeita consulta %s com 400', async (_label, query) => {
    await request(app.getHttpServer())
      .get('/stock-movements')
      .query(query)
      .expect(400);
  });
});
