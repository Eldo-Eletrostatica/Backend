import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { EmployeeRole } from '../src/employees/entities/employee.entity';
import { InventoryUnit } from '../src/inventory-items/entities/inventory-item.entity';

type CategoryResponse = { inventoryCategoryId: string; name: string };
type ItemResponse = { inventoryItemId: string; category: string };

const PASSWORD = 'Categorias@123';

describe('Categorias de estoque (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const tokens = {} as Record<EmployeeRole, string>;
  const employeeIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    for (const role of Object.values(EmployeeRole)) {
      const email = `${role}-${randomUUID()}@eldo.test`;
      const rows = await dataSource.query<{ employee_id: string }[]>(
        `INSERT INTO employees (name, email, password_hash, role)
         VALUES ('Categorias', $1, $2, $3) RETURNING employee_id`,
        [email, await hashPassword(PASSWORD), role],
      );
      employeeIds.push(rows[0].employee_id);
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      tokens[role] = (login.body as LoginResponseDto).accessToken;
    }
  });

  beforeEach(async () => {
    await clean();
  });

  afterAll(async () => {
    await clean();
    await dataSource.query(
      'DELETE FROM employees WHERE employee_id = ANY($1)',
      [employeeIds],
    );
    await app.close();
  });

  async function clean() {
    await dataSource.query('DELETE FROM stock_movements');
    await dataSource.query('DELETE FROM inventory_items');
    await dataSource.query('DELETE FROM inventory_categories');
  }

  const as = (role: EmployeeRole) => {
    const server = request(app.getHttpServer());
    const auth = `Bearer ${tokens[role]}`;
    return {
      get: (url: string) => server.get(url).set('Authorization', auth),
      post: (url: string) => server.post(url).set('Authorization', auth),
      patch: (url: string) => server.patch(url).set('Authorization', auth),
      delete: (url: string) => server.delete(url).set('Authorization', auth),
    };
  };

  async function createCategory(name: string): Promise<CategoryResponse> {
    const response = await as(EmployeeRole.Admin)
      .post('/inventory-categories')
      .send({ name })
      .expect(201);
    return response.body as CategoryResponse;
  }

  async function createItem(categoryId: string): Promise<ItemResponse> {
    const response = await as(EmployeeRole.Employee)
      .post('/inventory-items')
      .send({
        name: 'Tinta preta',
        categoryId,
        supplierName: 'Fornecedor',
        unit: InventoryUnit.Liter,
      })
      .expect(201);
    return response.body as ItemResponse;
  }

  it('o administrador cria categorias e todo funcionário as lista em ordem alfabética', async () => {
    await createCategory('Tintas');
    await createCategory('Insumos');

    for (const role of Object.values(EmployeeRole)) {
      const list = await as(role).get('/inventory-categories').expect(200);
      expect(
        (list.body as CategoryResponse[]).map((category) => category.name),
      ).toEqual(['Insumos', 'Tintas']);
    }
  });

  it('remove espaços das pontas do nome', async () => {
    const category = await createCategory('  Solventes  ');
    expect(category.name).toBe('Solventes');
  });

  it.each([EmployeeRole.Manager, EmployeeRole.Employee])(
    'recusa criar, renomear e remover categoria para %s com 403',
    async (role) => {
      const category = await createCategory('Tintas');

      await as(role)
        .post('/inventory-categories')
        .send({ name: 'Outra' })
        .expect(403);
      await as(role)
        .patch(`/inventory-categories/${category.inventoryCategoryId}`)
        .send({ name: 'Outra' })
        .expect(403);
      await as(role)
        .delete(`/inventory-categories/${category.inventoryCategoryId}`)
        .expect(403);
    },
  );

  it('recusa acesso sem login com 401', async () => {
    await request(app.getHttpServer()).get('/inventory-categories').expect(401);
  });

  it.each([
    ['sem nome', {}],
    ['com nome vazio', { name: '   ' }],
    ['com nome nulo', { name: null }],
    ['com nome longo demais', { name: 'x'.repeat(101) }],
  ])('rejeita categoria %s com 400', async (_label, body) => {
    await as(EmployeeRole.Admin)
      .post('/inventory-categories')
      .send(body)
      .expect(400);
  });

  it('recusa nome repetido, sem diferenciar maiúsculas, com 409', async () => {
    await createCategory('Tintas');

    const response = await as(EmployeeRole.Admin)
      .post('/inventory-categories')
      .send({ name: 'tintas' })
      .expect(409);
    expect((response.body as { message: string }).message).toBe(
      'Já existe uma categoria com esse nome.',
    );
  });

  it('renomear atualiza o nome que os itens mostram', async () => {
    const category = await createCategory('Tintas');
    const item = await createItem(category.inventoryCategoryId);

    await as(EmployeeRole.Admin)
      .patch(`/inventory-categories/${category.inventoryCategoryId}`)
      .send({ name: 'Tintas e vernizes' })
      .expect(200);

    const found = await as(EmployeeRole.Employee)
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect((found.body as ItemResponse).category).toBe('Tintas e vernizes');
  });

  it('renomear para o próprio nome ou para o de outra categoria', async () => {
    const tintas = await createCategory('Tintas');
    await createCategory('Insumos');

    await as(EmployeeRole.Admin)
      .patch(`/inventory-categories/${tintas.inventoryCategoryId}`)
      .send({ name: 'TINTAS' })
      .expect(200);
    await as(EmployeeRole.Admin)
      .patch(`/inventory-categories/${tintas.inventoryCategoryId}`)
      .send({ name: 'insumos' })
      .expect(409);
  });

  it('remover tira a categoria da lista, mas o item continua mostrando o nome dela', async () => {
    const category = await createCategory('Tintas');
    const item = await createItem(category.inventoryCategoryId);

    await as(EmployeeRole.Admin)
      .delete(`/inventory-categories/${category.inventoryCategoryId}`)
      .expect(204);

    const list = await as(EmployeeRole.Employee)
      .get('/inventory-categories')
      .expect(200);
    expect(list.body).toEqual([]);
    const found = await as(EmployeeRole.Employee)
      .get(`/inventory-items/${item.inventoryItemId}`)
      .expect(200);
    expect((found.body as ItemResponse).category).toBe('Tintas');
    const items = await as(EmployeeRole.Employee)
      .get('/inventory-items')
      .expect(200);
    expect((items.body as ItemResponse[]).map((i) => i.category)).toEqual([
      'Tintas',
    ]);
  });

  it('o item de categoria removida pode ser editado sem trocar a categoria', async () => {
    const category = await createCategory('Tintas');
    const item = await createItem(category.inventoryCategoryId);
    await as(EmployeeRole.Admin)
      .delete(`/inventory-categories/${category.inventoryCategoryId}`)
      .expect(204);

    const updated = await as(EmployeeRole.Employee)
      .patch(`/inventory-items/${item.inventoryItemId}`)
      .send({ minimumStock: 5, categoryId: category.inventoryCategoryId })
      .expect(200);
    expect((updated.body as ItemResponse).category).toBe('Tintas');
  });

  it('não cadastra item nem move item para uma categoria removida ou inexistente', async () => {
    const removed = await createCategory('Antiga');
    const active = await createCategory('Tintas');
    const item = await createItem(active.inventoryCategoryId);
    await as(EmployeeRole.Admin)
      .delete(`/inventory-categories/${removed.inventoryCategoryId}`)
      .expect(204);

    for (const categoryId of [removed.inventoryCategoryId, randomUUID()]) {
      await as(EmployeeRole.Employee)
        .post('/inventory-items')
        .send({
          name: 'Outro',
          categoryId,
          supplierName: 'Fornecedor',
          unit: InventoryUnit.Unit,
        })
        .expect(404);
      await as(EmployeeRole.Employee)
        .patch(`/inventory-items/${item.inventoryItemId}`)
        .send({ categoryId })
        .expect(404);
    }
  });

  it('permite criar de novo uma categoria com o nome de uma removida', async () => {
    const category = await createCategory('Tintas');
    await as(EmployeeRole.Admin)
      .delete(`/inventory-categories/${category.inventoryCategoryId}`)
      .expect(204);

    const again = await createCategory('Tintas');
    expect(again.inventoryCategoryId).not.toBe(category.inventoryCategoryId);
  });

  it('responde 404 ao renomear ou remover categoria inexistente ou já removida', async () => {
    const category = await createCategory('Tintas');
    await as(EmployeeRole.Admin)
      .delete(`/inventory-categories/${category.inventoryCategoryId}`)
      .expect(204);

    for (const id of [category.inventoryCategoryId, randomUUID()]) {
      await as(EmployeeRole.Admin)
        .patch(`/inventory-categories/${id}`)
        .send({ name: 'Nova' })
        .expect(404);
      await as(EmployeeRole.Admin)
        .delete(`/inventory-categories/${id}`)
        .expect(404);
    }
  });

  it('o alerta de estoque mínimo continua trazendo o nome da categoria', async () => {
    const category = await createCategory('Tintas');
    await createItem(category.inventoryCategoryId);

    const low = await as(EmployeeRole.Employee)
      .get('/inventory-items/low-stock')
      .expect(200);
    expect((low.body as ItemResponse[]).map((i) => i.category)).toEqual([
      'Tintas',
    ]);
  });
});
