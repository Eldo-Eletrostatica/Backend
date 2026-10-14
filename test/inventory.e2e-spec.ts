import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import type { StockMovementResponseDto } from '../src/stock-movements/dto/stock-movement-response.dto';

type InventoryItemResponse = {
  inventoryItemId: string;
  name: string;
  unit: string;
  balance: number;
  minimumStock: number;
  inventoryCategory: { name: string };
  hasPossibleDuplicate: boolean;
};

type InventoryCategoryResponse = {
  inventoryCategoryId: string;
  name: string;
};

function bodyAs<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Inventory API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let inventoryCategoryId: string;
  let supplierId: string;
  let employeeId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE stock_movements, inventory_items, inventory_categories, suppliers, employees RESTART IDENTITY CASCADE',
    );
    const categories = (await dataSource.query(
      "INSERT INTO inventory_categories (name) VALUES ('Tintas') RETURNING inventory_category_id",
    )) as unknown as { inventory_category_id: string }[];
    const suppliers = (await dataSource.query(
      "INSERT INTO suppliers (name, contact) VALUES ('Fornecedor', 'contato@example.com') RETURNING supplier_id",
    )) as unknown as { supplier_id: string }[];
    const employees = (await dataSource.query(
      "INSERT INTO employees (name, email, password_hash) VALUES ('Ana', 'ana@example.com', 'hash') RETURNING employee_id",
    )) as unknown as { employee_id: string }[];
    const category = categories[0];
    const supplier = suppliers[0];
    const employee = employees[0];
    inventoryCategoryId = category.inventory_category_id;
    supplierId = supplier.supplier_id;
    employeeId = employee.employee_id;
  });

  afterAll(async () => {
    await dataSource.query(
      'TRUNCATE stock_movements, inventory_items, inventory_categories, suppliers, employees RESTART IDENTITY CASCADE',
    );
    await app.close();
  });

  function createItem(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/inventory-items')
      .send({
        name: 'Tinta preta',
        unit: 'liter',
        inventoryCategoryId,
        supplierId,
        balance: 10,
        minimumStock: 2,
        ...overrides,
      });
  }

  it('cria, consulta, atualiza e remove logicamente um item', async () => {
    const created = bodyAs<InventoryItemResponse>(
      await createItem().expect(201),
    );
    expect(created).toMatchObject({
      name: 'Tinta preta',
      unit: 'liter',
      balance: 10,
      minimumStock: 2,
    });

    await request(app.getHttpServer())
      .get(`/inventory-items/${created.inventoryItemId}`)
      .expect(200)
      .then((response) =>
        expect(
          bodyAs<InventoryItemResponse>(response).inventoryCategory.name,
        ).toBe('Tintas'),
      );
    const updated = await request(app.getHttpServer())
      .patch(`/inventory-items/${created.inventoryItemId}`)
      .send({ minimumStock: 4 })
      .expect(200);
    expect(bodyAs<InventoryItemResponse>(updated).minimumStock).toBe(4);
    await request(app.getHttpServer())
      .delete(`/inventory-items/${created.inventoryItemId}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/inventory-items/${created.inventoryItemId}`)
      .expect(404);
  });

  it('lista as categorias disponíveis para cadastro', async () => {
    const response = await request(app.getHttpServer())
      .get('/inventory-categories')
      .expect(200);
    expect(
      bodyAs<{ inventoryCategoryId: string; name: string }[]>(response),
    ).toEqual([
      expect.objectContaining({ inventoryCategoryId, name: 'Tintas' }),
    ]);
  });

  it('cria, edita e remove uma categoria', async () => {
    const created = bodyAs<InventoryCategoryResponse>(
      await request(app.getHttpServer())
        .post('/inventory-categories')
        .send({ name: 'Insumos' })
        .expect(201),
    );
    const updated = await request(app.getHttpServer())
      .patch(`/inventory-categories/${created.inventoryCategoryId}`)
      .send({ name: 'Matéria-prima' })
      .expect(200);
    expect(bodyAs<InventoryCategoryResponse>(updated).name).toBe(
      'Matéria-prima',
    );
    await request(app.getHttpServer())
      .delete(`/inventory-categories/${created.inventoryCategoryId}`)
      .expect(204);
  });

  it('avisa sobre item com nome possivelmente duplicado sem bloquear o cadastro', async () => {
    await createItem().expect(201);
    const duplicate = bodyAs<InventoryItemResponse>(
      await createItem().expect(201),
    );
    expect(duplicate.hasPossibleDuplicate).toBe(true);
  });

  it('rejeita item sem categoria válida', async () => {
    await createItem({
      inventoryCategoryId: '00000000-0000-4000-8000-000000000001',
    }).expect(404);
  });

  it('registra entrada e saída atualizando o saldo', async () => {
    const item = bodyAs<InventoryItemResponse>(await createItem().expect(201));
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        inventoryItemId: item.inventoryItemId,
        employeeId,
        type: 'inbound',
        quantity: 3,
        reason: 'Compra',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        inventoryItemId: item.inventoryItemId,
        employeeId,
        type: 'outbound',
        quantity: 4,
        reason: 'Produção',
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect(bodyAs<InventoryItemResponse>(response).balance).toBe(9);
  });

  it('rejeita saída maior que o saldo sem alterar o item', async () => {
    const item = bodyAs<InventoryItemResponse>(
      await createItem({ balance: 2 }).expect(201),
    );
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        inventoryItemId: item.inventoryItemId,
        employeeId,
        type: 'outbound',
        quantity: 3,
        reason: 'Produção',
      })
      .expect(409);
    const response = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect(bodyAs<InventoryItemResponse>(response).balance).toBe(2);
  });

  it('lista itens no limite mínimo e remove o alerta após entrada', async () => {
    const item = bodyAs<InventoryItemResponse>(
      await createItem({ balance: 2 }).expect(201),
    );
    const lowStock = await request(app.getHttpServer())
      .get('/inventory-items/low-stock')
      .expect(200);
    expect(bodyAs<InventoryItemResponse[]>(lowStock)).toEqual([
      expect.objectContaining({ inventoryItemId: item.inventoryItemId }),
    ]);
    const count = await request(app.getHttpServer())
      .get('/inventory-items/low-stock/count')
      .expect(200);
    expect(bodyAs<{ count: number }>(count).count).toBe(1);
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        inventoryItemId: item.inventoryItemId,
        employeeId,
        type: 'inbound',
        quantity: 1,
        reason: 'Compra',
      })
      .expect(201);
    const empty = await request(app.getHttpServer())
      .get('/inventory-items/low-stock')
      .expect(200);
    expect(bodyAs<InventoryItemResponse[]>(empty)).toEqual([]);
    const emptyCount = await request(app.getHttpServer())
      .get('/inventory-items/low-stock/count')
      .expect(200);
    expect(bodyAs<{ count: number }>(emptyCount).count).toBe(0);
  });

  it('consulta movimentações em um período', async () => {
    const item = bodyAs<InventoryItemResponse>(await createItem().expect(201));
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        inventoryItemId: item.inventoryItemId,
        employeeId,
        type: 'inbound',
        quantity: 1,
        reason: 'Compra',
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/stock-movements')
      .query({
        from: '2000-01-01',
        to: '2999-12-31',
        inventoryItemId: item.inventoryItemId,
      })
      .expect(200);
    const movements = bodyAs<StockMovementResponseDto[]>(response);
    expect(movements).toHaveLength(1);
    expect(movements[0].employee.name).toBe('Ana');
    expect(movements[0].employee).not.toHaveProperty('passwordHash');
  });

  it('preserva o nome da categoria após sua exclusão lógica', async () => {
    const item = bodyAs<InventoryItemResponse>(await createItem().expect(201));
    await request(app.getHttpServer())
      .delete(`/inventory-categories/${inventoryCategoryId}`)
      .expect(204);
    const response = await request(app.getHttpServer())
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect(bodyAs<InventoryItemResponse>(response).inventoryCategory.name).toBe(
      'Tintas',
    );
  });
});
