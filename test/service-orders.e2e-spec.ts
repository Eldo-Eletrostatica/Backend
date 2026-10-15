import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

type ServiceOrderResponse = {
  serviceOrderId: string;
  trackingCode: string;
  status: string;
  dueDate: string;
  completedAt?: string;
  sellerEmployee?: unknown;
};

function bodyAs<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Service orders API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let customerId: string;
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
      'TRUNCATE service_orders, customers, employees RESTART IDENTITY CASCADE',
    );
    const customers = (await dataSource.query(
      "INSERT INTO customers (type, name, document, email, phone) VALUES ('business', 'ACME', '98765432100011', 'contato@acme.com', '61999999999') RETURNING customer_id",
    )) as unknown as { customer_id: string }[];
    const employees = (await dataSource.query(
      "INSERT INTO employees (name, email, password_hash) VALUES ('Ana', 'ana@example.com', 'hash') RETURNING employee_id",
    )) as unknown as { employee_id: string }[];
    const customer = customers[0];
    const employee = employees[0];
    customerId = customer.customer_id;
    employeeId = employee.employee_id;
  });

  afterAll(async () => {
    await dataSource.query(
      'TRUNCATE service_orders, customers, employees RESTART IDENTITY CASCADE',
    );
    await app.close();
  });

  function createOrder(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/service-orders')
      .send({
        customerId,
        sellerEmployeeId: employeeId,
        total: 120,
        commission: 12,
        soldAt: '2026-10-01T12:00:00.000Z',
        scope: 'Pintura de peças metálicas',
        dueDate: '2026-10-20',
        ...overrides,
      });
  }

  it('cria uma OS enfileirada com protocolo público', async () => {
    const body = bodyAs<ServiceOrderResponse>(await createOrder().expect(201));
    expect(body).toMatchObject({
      status: 'queued',
      customerId,
      dueDate: '2026-10-20',
    });
    expect(body.trackingCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it('lista as OS cadastradas para a equipe', async () => {
    await createOrder().expect(201);
    const response = await request(app.getHttpServer())
      .get('/service-orders')
      .expect(200);
    const orders = bodyAs<ServiceOrderResponse[]>(response);
    expect(orders).toHaveLength(1);
    expect(orders[0]).not.toHaveProperty('sellerEmployee');
  });

  it('altera o status e grava a data de conclusão', async () => {
    const order = bodyAs<ServiceOrderResponse>(await createOrder().expect(201));
    const response = await request(app.getHttpServer())
      .patch(`/service-orders/${order.serviceOrderId}/status`)
      .send({ status: 'completed' })
      .expect(200);
    const body = bodyAs<ServiceOrderResponse>(response);
    expect(body.status).toBe('completed');
    expect(body.completedAt).toEqual(expect.any(String));
  });

  it('consulta o andamento pelo protocolo sem expor dados pessoais', async () => {
    const order = bodyAs<ServiceOrderResponse>(await createOrder().expect(201));
    const response = await request(app.getHttpServer())
      .get(`/service-orders/tracking/${order.trackingCode}`)
      .expect(200);
    const body = bodyAs<ServiceOrderResponse>(response);
    expect(body).toEqual({
      trackingCode: order.trackingCode,
      status: 'queued',
      dueDate: '2026-10-20',
    });
  });

  it('consulta por CNPJ e retorna somente status e previsão', async () => {
    await createOrder().expect(201);
    const completed = bodyAs<ServiceOrderResponse>(
      await createOrder({ scope: 'Concluída' }).expect(201),
    );
    await request(app.getHttpServer())
      .patch(`/service-orders/${completed.serviceOrderId}/status`)
      .send({ status: 'completed' })
      .expect(200);
    const response = await request(app.getHttpServer())
      .get('/service-orders/tracking')
      .query({ cnpj: '98.765.432/1000-11' })
      .expect(200);
    const body = bodyAs<ServiceOrderResponse[]>(response);
    expect(body).toEqual([{ status: 'queued', dueDate: '2026-10-20' }]);
  });

  it('lista OS vencidas e não concluídas', async () => {
    const overdue = bodyAs<ServiceOrderResponse>(
      await createOrder({
        dueDate: '2000-01-01',
      }).expect(201),
    );
    const completed = bodyAs<ServiceOrderResponse>(
      await createOrder({ dueDate: '2000-01-01', scope: 'Concluída' }).expect(
        201,
      ),
    );
    await request(app.getHttpServer())
      .patch(`/service-orders/${completed.serviceOrderId}/status`)
      .send({ status: 'completed' })
      .expect(200);
    await createOrder({ dueDate: '2999-01-01' }).expect(201);
    const response = await request(app.getHttpServer())
      .get('/service-orders/overdue')
      .expect(200);
    expect(
      bodyAs<ServiceOrderResponse[]>(response).map(
        (order) => order.serviceOrderId,
      ),
    ).toEqual([overdue.serviceOrderId]);
  });
});
