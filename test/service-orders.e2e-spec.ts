import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { EmployeeRole } from '../src/employees/entities/employee.entity';
import {
  OrderStatus,
  SALE_STATUSES,
} from '../src/orders/entities/order.entity';

const SCOPE = 'Pintura de peças metálicas';
const FUTURE_DUE_DATE = '2999-01-01';
const PAST_DUE_DATE = '2000-01-01';

type ServiceOrderResponse = {
  orderId: string;
  trackingCode: string;
  status: string;
  dueDate: string;
  completedAt: string | null;
  scope?: string;
  sellerEmployee?: unknown;
  customer?: { name: string };
};

describe('Ordens de serviço (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authEmployeeId: string;
  let authToken: string;

  const created = {
    orderIds: [] as string[],
    customerIds: [] as string[],
    employeeIds: [] as string[],
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const email = `manager-${randomUUID()}@eldo.test`;
    const password = 'ManagerPassword@123';
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Gestor OS', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(password), EmployeeRole.Manager],
    );
    authEmployeeId = rows[0].employee_id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    authToken = (loginRes.body as LoginResponseDto).accessToken;
  });

  afterEach(async () => {
    await dataSource.query(
      `DELETE FROM orders
        WHERE order_id = ANY($1) OR customer_id = ANY($2) OR seller_employee_id = ANY($3)`,
      [created.orderIds, created.customerIds, created.employeeIds],
    );
    await dataSource.query(
      'DELETE FROM customers WHERE customer_id = ANY($1)',
      [created.customerIds],
    );
    await dataSource.query(
      'DELETE FROM employees WHERE employee_id = ANY($1)',
      [created.employeeIds],
    );
    created.orderIds.length = 0;
    created.customerIds.length = 0;
    created.employeeIds.length = 0;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM employees WHERE employee_id = $1', [
      authEmployeeId,
    ]);
    await app.close();
  });

  const api = () => {
    const server = request(app.getHttpServer());
    return {
      get: (url: string) =>
        server.get(url).set('Authorization', `Bearer ${authToken}`),
      patch: (url: string) =>
        server.patch(url).set('Authorization', `Bearer ${authToken}`),
    };
  };

  function randomDocument(): string {
    return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
  }

  async function insertEmployee(): Promise<string> {
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash)
       VALUES ('Ana', $1, 'hash') RETURNING employee_id`,
      [`${randomUUID()}@eldo.test`],
    );
    created.employeeIds.push(rows[0].employee_id);
    return rows[0].employee_id;
  }

  async function insertCustomer(document = randomDocument()): Promise<string> {
    const rows = await dataSource.query<{ customer_id: string }[]>(
      `INSERT INTO customers (type, name, document, email, phone)
       VALUES ('business', 'ACME', $1, 'contato@acme.test', '61999999999')
       RETURNING customer_id`,
      [document],
    );
    created.customerIds.push(rows[0].customer_id);
    return rows[0].customer_id;
  }

  // The sale launch (US21) is what creates the service order. These rows are
  // already in a sale status, which is what CHK_orders_sale requires.
  async function insertOrder(
    status: OrderStatus,
    dueDate = FUTURE_DUE_DATE,
    customerId?: string,
  ): Promise<ServiceOrderResponse> {
    const ownerId = customerId ?? (await insertCustomer());
    const isSale = SALE_STATUSES.includes(status);
    const sellerEmployeeId = isSale ? await insertEmployee() : null;
    const trackingCode = isSale
      ? randomUUID().replace(/-/g, '').slice(0, 8)
      : null;
    const rows = await dataSource.query<ServiceOrderResponse[]>(
      `INSERT INTO orders (
         customer_id, source, status, final_price, seller_employee_id,
         commission, sold_at, tracking_code, scope, due_date
       )
       VALUES ($1, 'internal', $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING order_id AS "orderId", tracking_code AS "trackingCode",
                 status, due_date AS "dueDate"`,
      [
        ownerId,
        status,
        isSale ? 120 : null,
        sellerEmployeeId,
        isSale ? 0 : null,
        isSale ? new Date('2026-10-01T12:00:00.000Z') : null,
        trackingCode?.toUpperCase().replace(/[01OI]/g, 'A') ?? null,
        isSale ? SCOPE : null,
        isSale ? dueDate : null,
      ],
    );
    const row = rows[0];
    created.orderIds.push(row.orderId);
    return {
      ...row,
      trackingCode: row.trackingCode?.trim() ?? '',
      dueDate:
        row.dueDate === null || row.dueDate === undefined
          ? ''
          : String(row.dueDate).slice(0, 10),
    };
  }

  it('lista só as OS, com o cliente e sem o vendedor', async () => {
    const serviceOrder = await insertOrder(OrderStatus.Queued);
    await insertOrder(OrderStatus.Requested);

    const response = await api().get('/service-orders').expect(200);
    const orders = (response.body as ServiceOrderResponse[]).filter((order) =>
      created.orderIds.includes(order.orderId),
    );

    expect(orders.map((order) => order.orderId)).toEqual([
      serviceOrder.orderId,
    ]);
    expect(orders[0].customer?.name).toBe('ACME');
    expect(orders[0]).not.toHaveProperty('sellerEmployee');
    expect(JSON.stringify(orders[0])).not.toContain('passwordHash');
  });

  it.each([
    [OrderStatus.Queued, OrderStatus.InProduction],
    [OrderStatus.Queued, OrderStatus.Completed],
    [OrderStatus.Finishing, OrderStatus.Queued],
  ])('aceita a mudança de %s para %s', async (from, to) => {
    const order = await insertOrder(from);
    const response = await api()
      .patch(`/service-orders/${order.orderId}/status`)
      .send({ status: to })
      .expect(200);
    const body = response.body as ServiceOrderResponse;
    expect(body.status).toBe(to);
    if (to === OrderStatus.Completed) {
      expect(body.completedAt).toEqual(expect.any(String));
    } else {
      expect(body.completedAt).toBeNull();
    }
  });

  it.each([
    ['de orçamento', OrderStatus.Requested],
    ['desconhecido', 'delivered'],
  ])('rejeita status %s com 400', async (_label, status) => {
    const order = await insertOrder(OrderStatus.Queued);
    await api()
      .patch(`/service-orders/${order.orderId}/status`)
      .send({ status })
      .expect(400);
  });

  it('não trata um orçamento como ordem de serviço', async () => {
    const quote = await insertOrder(OrderStatus.Approved);
    await api()
      .patch(`/service-orders/${quote.orderId}/status`)
      .send({ status: OrderStatus.InProduction })
      .expect(404);
  });

  it('consulta o andamento pelo protocolo sem expor dados pessoais', async () => {
    const order = await insertOrder(OrderStatus.Queued, '2026-10-20');
    const response = await request(app.getHttpServer())
      .get(`/service-orders/tracking/${order.trackingCode}`)
      .expect(200);
    expect(response.body).toEqual({
      trackingCode: order.trackingCode,
      status: OrderStatus.Queued,
      dueDate: '2026-10-20',
    });
  });

  it.each([
    ['curto', 'ABC'],
    ['com caracteres ambíguos', 'OOOOOOOO'],
  ])('rejeita protocolo %s com 400', async (_label, trackingCode) => {
    await request(app.getHttpServer())
      .get(`/service-orders/tracking/${trackingCode}`)
      .expect(400);
  });

  it('responde 404 para um protocolo inexistente', async () => {
    await request(app.getHttpServer())
      .get('/service-orders/tracking/ABCD2345')
      .expect(404);
  });

  it('consulta por CNPJ e devolve só etapa e prazo das OS em andamento', async () => {
    const document = randomDocument();
    const customerId = await insertCustomer(document);
    await insertOrder(OrderStatus.Queued, '2026-10-20', customerId);
    const completed = await insertOrder(
      OrderStatus.Queued,
      '2026-10-20',
      customerId,
    );
    await api()
      .patch(`/service-orders/${completed.orderId}/status`)
      .send({ status: OrderStatus.Completed })
      .expect(200);

    const punctuated = document.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    );
    const response = await request(app.getHttpServer())
      .get('/service-orders/tracking')
      .query({ cnpj: punctuated })
      .expect(200);

    expect(response.body).toEqual([
      { status: OrderStatus.Queued, dueDate: '2026-10-20' },
    ]);
  });

  it.each([
    ['curto', '123'],
    ['de pessoa física', '12345678901'],
  ])('rejeita CNPJ %s com 400', async (_label, cnpj) => {
    await request(app.getHttpServer())
      .get('/service-orders/tracking')
      .query({ cnpj })
      .expect(400);
  });

  it('lista só as OS vencidas e não concluídas', async () => {
    const overdue = await insertOrder(OrderStatus.InProduction, PAST_DUE_DATE);
    const completed = await insertOrder(OrderStatus.Queued, PAST_DUE_DATE);
    await api()
      .patch(`/service-orders/${completed.orderId}/status`)
      .send({ status: OrderStatus.Completed })
      .expect(200);
    await insertOrder(OrderStatus.Queued, FUTURE_DUE_DATE);

    const response = await api().get('/service-orders/overdue').expect(200);
    const ids = (response.body as ServiceOrderResponse[])
      .map((order) => order.orderId)
      .filter((orderId) => created.orderIds.includes(orderId));
    expect(ids).toEqual([overdue.orderId]);
  });

  it('não considera atrasada a OS que vence hoje em Brasília', async () => {
    const dueToday = await insertOrder(OrderStatus.Queued, '2026-10-21');
    const overdue = await insertOrder(OrderStatus.InProduction, '2026-10-20');
    jest.useFakeTimers({
      now: new Date('2026-10-22T01:00:00.000Z'),
      doNotFake: [
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'nextTick',
        'hrtime',
      ],
    });
    try {
      const response = await api().get('/service-orders/overdue').expect(200);
      const ids = (response.body as ServiceOrderResponse[])
        .map((order) => order.orderId)
        .filter((orderId) => created.orderIds.includes(orderId));
      expect(ids).toEqual([overdue.orderId]);
      expect(ids).not.toContain(dueToday.orderId);
    } finally {
      jest.useRealTimers();
    }
  });

  it('responde lista vazia quando não há atraso', async () => {
    await insertOrder(OrderStatus.Queued, FUTURE_DUE_DATE);
    const response = await api().get('/service-orders/overdue').expect(200);
    const ids = (response.body as ServiceOrderResponse[])
      .map((order) => order.orderId)
      .filter((orderId) => created.orderIds.includes(orderId));
    expect(ids).toEqual([]);
  });
});
