import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { AccumulatedCommissionsResponseDto } from '../src/commissions/dto/accumulated-commissions-response.dto';
import {
  CommissionType,
  EmployeeRole,
} from '../src/employees/entities/employee.entity';

describe('Comissões Acumuladas (e2e) - US23', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authEmployeeId: string;
  let authToken: string;

  const created = {
    employeeIds: [] as string[],
    orderIds: [] as string[],
    customerIds: [] as string[],
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const email = `auth-${randomUUID()}@eldo.com.br`;
    const password = 'SenhaValida@123';
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Funcionário Autenticado', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(password), EmployeeRole.Employee],
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
    created.orderIds = [];

    await dataSource.query(
      `DELETE FROM customers WHERE customer_id = ANY($1)`,
      [created.customerIds],
    );
    created.customerIds = [];

    await dataSource.query(
      `DELETE FROM employees WHERE employee_id = ANY($1)`,
      [created.employeeIds],
    );
    created.employeeIds = [];
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM employees WHERE employee_id = $1`, [
      authEmployeeId,
    ]);
    await app.close();
  });

  async function createTestEmployee(
    commissionType: CommissionType | null = null,
    commissionValue: number | null = null,
  ): Promise<string> {
    const employeeId = randomUUID();
    const email = `test-${employeeId.slice(0, 8)}@eldo.com.br`;
    await dataSource.query(
      `INSERT INTO employees (employee_id, name, email, password_hash, role, commission_type, commission_value)
       VALUES ($1, $2, $3, 'hash', $4, $5, $6)`,
      [
        employeeId,
        `Vendedor ${employeeId.slice(0, 4)}`,
        email,
        EmployeeRole.Employee,
        commissionType,
        commissionValue,
      ],
    );
    created.employeeIds.push(employeeId);
    return employeeId;
  }

  function utcDateFromToday(dayOffset: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return date.toISOString().slice(0, 10);
  }

  function randomDocument(): string {
    return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
  }

  async function insertCustomer(): Promise<string> {
    const customerId = randomUUID();
    await dataSource.query(
      `INSERT INTO customers (customer_id, type, name, document, email, phone)
       VALUES ($1, 'business', 'ACME Test', $2, $3, '61999999999')`,
      [customerId, randomDocument(), `acme-${customerId.slice(0, 8)}@test.com`],
    );
    created.customerIds.push(customerId);
    return customerId;
  }

  async function insertApprovedOrder(finalPrice = 1000): Promise<string> {
    const customerId = await insertCustomer();
    const orderId = randomUUID();
    await dataSource.query(
      `INSERT INTO orders (order_id, customer_id, source, status, final_price)
       VALUES ($1, $2, 'pdf', 'approved', $3)`,
      [orderId, customerId, finalPrice],
    );
    created.orderIds.push(orderId);
    return orderId;
  }

  async function insertSoldOrder(
    sellerEmployeeId: string,
    finalPrice: number,
    commission: number,
    soldAt: Date,
    status = 'queued',
  ): Promise<string> {
    const customerId = await insertCustomer();
    const orderId = randomUUID();
    const trackingCode = `T${randomInt(1000000, 9999999)}`;
    await dataSource.query(
      `INSERT INTO orders (
         order_id, customer_id, seller_employee_id, source, status,
         final_price, commission, sold_at, tracking_code, scope, due_date
       ) VALUES ($1, $2, $3, 'pdf', $4, $5, $6, $7, $8, 'Escopo de teste', '2030-01-01')`,
      [
        orderId,
        customerId,
        sellerEmployeeId,
        status,
        finalPrice,
        commission,
        soldAt,
        trackingCode,
      ],
    );
    created.orderIds.push(orderId);
    return orderId;
  }

  describe('Critérios de Aceite da US23', () => {
    it('Critério 2: retorna valor zerado e lista vazia quando não houve vendas no período', async () => {
      const employeeId = await createTestEmployee();

      const res = await request(app.getHttpServer())
        .get(`/employees/${employeeId}/commissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(200);

      const body = res.body as AccumulatedCommissionsResponseDto;
      expect(body.employeeId).toBe(employeeId);
      expect(body.startDate).toBe('2026-10-01');
      expect(body.endDate).toBe('2026-10-31');
      expect(body.totalCommission).toBe(0);
      expect(body.totalSalesValue).toBe(0);
      expect(body.salesCount).toBe(0);
      expect(body.sales).toEqual([]);
    });

    it('Critério 1: calcula o total acumulado das comissões do vendedor no período', async () => {
      const employeeId = await createTestEmployee();

      await insertSoldOrder(
        employeeId,
        1500,
        75,
        new Date('2026-10-05T14:00:00.000Z'),
      );
      await insertSoldOrder(
        employeeId,
        2500,
        125,
        new Date('2026-10-20T10:30:00.000Z'),
      );

      // Another seller's sale in the same period must not count.
      const otherEmployeeId = await createTestEmployee();
      await insertSoldOrder(
        otherEmployeeId,
        5000,
        250,
        new Date('2026-10-15T12:00:00.000Z'),
      );

      // A sale outside the period must not count.
      await insertSoldOrder(
        employeeId,
        3000,
        150,
        new Date('2026-11-05T10:00:00.000Z'),
      );

      const res = await request(app.getHttpServer())
        .get(`/employees/${employeeId}/commissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(200);

      const body = res.body as AccumulatedCommissionsResponseDto;
      expect(body.employeeId).toBe(employeeId);
      expect(body.totalCommission).toBe(200); // 75 + 125
      expect(body.totalSalesValue).toBe(4000); // 1500 + 2500
      expect(body.salesCount).toBe(2);
      expect(body.sales).toHaveLength(2);
      expect(body.sales[0].commission).toBe(75);
      expect(body.sales[1].commission).toBe(125);
    });

    it('Critério 3: reflete imediatamente a nova comissão quando uma nova venda é lançada', async () => {
      const employeeId = await createTestEmployee(CommissionType.Percentage, 5);
      // The sale is stamped with the current instant; a UTC range from
      // yesterday to tomorrow always contains today in Brasília time.
      const period = {
        startDate: utcDateFromToday(-1),
        endDate: utcDateFromToday(1),
      };

      const initialRes = await request(app.getHttpServer())
        .get(`/employees/${employeeId}/commissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query(period)
        .expect(200);

      expect(
        (initialRes.body as AccumulatedCommissionsResponseDto).totalCommission,
      ).toBe(0);

      // 5% of R$ 2,000.00 is R$ 100.00.
      const orderId = await insertApprovedOrder(2000);
      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId,
          sellerEmployeeId: employeeId,
          scope: 'Pintura de estruturas metálicas',
          dueDate: '2030-02-01',
        })
        .expect(201);

      const updatedRes = await request(app.getHttpServer())
        .get(`/employees/${employeeId}/commissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query(period)
        .expect(200);

      const updatedBody = updatedRes.body as AccumulatedCommissionsResponseDto;
      expect(updatedBody.totalCommission).toBe(100);
      expect(updatedBody.totalSalesValue).toBe(2000);
      expect(updatedBody.salesCount).toBe(1);
      expect(updatedBody.sales[0].orderId).toBe(orderId);
      expect(updatedBody.sales[0].commission).toBe(100);
    });
  });

  describe('Validações de entrada e erros', () => {
    it.each([
      ['sem datas', {}],
      ['sem endDate', { startDate: '2026-10-01' }],
      ['sem startDate', { endDate: '2026-10-31' }],
      [
        'formato inválido de startDate',
        { startDate: '01/10/2026', endDate: '2026-10-31' },
      ],
      [
        'formato inválido de endDate',
        { startDate: '2026-10-01', endDate: '31-10-2026' },
      ],
      [
        'startDate inexistente no calendário',
        { startDate: '2026-02-30', endDate: '2026-03-31' },
      ],
      [
        'endDate inexistente no calendário',
        { startDate: '2026-04-01', endDate: '2026-04-31' },
      ],
      [
        'data com horário',
        { startDate: '2026-10-01T10:00:00Z', endDate: '2026-10-31' },
      ],
    ])(
      'rejeita parâmetros ausentes ou com formato incorreto: %s',
      async (_, query) => {
        const employeeId = await createTestEmployee();

        await request(app.getHttpServer())
          .get(`/employees/${employeeId}/commissions`)
          .set('Authorization', `Bearer ${authToken}`)
          .query(query)
          .expect(400);
      },
    );

    it.each([
      ['2026-10-31', '2026-10-01', 'data inicial posterior à final'],
      [
        '2026-12-15',
        '2026-12-10',
        'data inicial posterior à final no mesmo mês',
      ],
    ])(
      'rejeita intervalo invertido onde startDate > endDate (%s > %s): %s',
      async (startDate, endDate) => {
        const employeeId = await createTestEmployee();

        const res = await request(app.getHttpServer())
          .get(`/employees/${employeeId}/commissions`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ startDate, endDate })
          .expect(400);

        const body = res.body as { message: string };
        expect(body.message).toContain(
          'A data inicial não pode ser posterior à data final.',
        );
      },
    );

    it('retorna 404 para funcionário inexistente', async () => {
      const nonExistentId = randomUUID();

      await request(app.getHttpServer())
        .get(`/employees/${nonExistentId}/commissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(404);
    });

    it('retorna 404 para funcionário com exclusão lógica (deleted_at)', async () => {
      const employeeId = await createTestEmployee();

      await dataSource.query(
        `UPDATE employees SET deleted_at = NOW() WHERE employee_id = $1`,
        [employeeId],
      );

      await request(app.getHttpServer())
        .get(`/employees/${employeeId}/commissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(404);
    });
  });
});
