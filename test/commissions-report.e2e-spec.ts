import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { CommissionReportResponseDto } from '../src/commissions/dto/commission-report-response.dto';
import { SalesRankingResponseDto } from '../src/sales-rankings/dto/sales-ranking-response.dto';
import {
  CommissionType,
  EmployeeRole,
} from '../src/employees/entities/employee.entity';

describe('Relatórios de Comissão e Ranking de Vendas (e2e) - US24', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let managerEmployeeId: string;
  let managerToken: string;

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

    const email = `manager-${randomUUID()}@eldo.com.br`;
    const password = 'ManagerPassword@123';
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Gestor Relatórios', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(password), EmployeeRole.Manager],
    );
    managerEmployeeId = rows[0].employee_id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    managerToken = (loginRes.body as LoginResponseDto).accessToken;
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
      managerEmployeeId,
    ]);
    await app.close();
  });

  async function createTestEmployee(
    name: string,
    commissionType: CommissionType | null = CommissionType.Percentage,
    commissionValue: number | null = 5,
  ): Promise<string> {
    const employeeId = randomUUID();
    const email = `test-${employeeId.slice(0, 8)}@eldo.com.br`;
    await dataSource.query(
      `INSERT INTO employees (employee_id, name, email, password_hash, role, commission_type, commission_value)
       VALUES ($1, $2, $3, 'hash', $4, $5, $6)`,
      [
        employeeId,
        name,
        email,
        EmployeeRole.Employee,
        commissionType,
        commissionValue,
      ],
    );
    created.employeeIds.push(employeeId);
    return employeeId;
  }

  function randomDocument(): string {
    return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
  }

  async function insertCustomer(): Promise<string> {
    const customerId = randomUUID();
    await dataSource.query(
      `INSERT INTO customers (customer_id, type, name, document, email, phone)
       VALUES ($1, 'business', 'Cliente Teste', $2, $3, '61999999999')`,
      [
        customerId,
        randomDocument(),
        `cliente-${customerId.slice(0, 8)}@test.com`,
      ],
    );
    created.customerIds.push(customerId);
    return customerId;
  }

  async function insertSoldOrder(
    sellerEmployeeId: string,
    finalPrice: number,
    commission: number,
    soldAt: Date,
    status = 'completed',
  ): Promise<string> {
    const customerId = await insertCustomer();
    const orderId = randomUUID();
    const trackingCode = `T${randomInt(1000000, 9999999)}`;
    await dataSource.query(
      `INSERT INTO orders (
         order_id, customer_id, seller_employee_id, source, status,
         final_price, commission, sold_at, tracking_code, scope, due_date
       ) VALUES ($1, $2, $3, 'pdf', $4, $5, $6, $7, $8, 'Pintura Epóxi', '2030-01-01')`,
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

  describe('Critérios de Aceite da US24', () => {
    it('Critério 1: visualiza relatório consolidado de comissão por funcionário num período', async () => {
      const emp1 = await createTestEmployee(
        'Bernardo Vendedor',
        CommissionType.Percentage,
        5,
      );
      const emp2 = await createTestEmployee(
        'Aline Vendedora',
        CommissionType.Fixed,
        50,
      );

      await insertSoldOrder(
        emp1,
        1000,
        50,
        new Date('2026-10-05T12:00:00.000Z'),
      );
      await insertSoldOrder(
        emp1,
        2000,
        100,
        new Date('2026-10-15T12:00:00.000Z'),
      );

      // An active seller without sales still appears, with zeroed totals.

      const res = await request(app.getHttpServer())
        .get('/commissions/report')
        .set('Authorization', `Bearer ${managerToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(200);

      const body = res.body as CommissionReportResponseDto;
      expect(body.period).toEqual({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });
      expect(body.summary.totalCommission).toBeGreaterThanOrEqual(150);
      expect(body.summary.totalSalesValue).toBeGreaterThanOrEqual(3000);
      expect(body.summary.totalSalesCount).toBeGreaterThanOrEqual(2);

      const bernardo = body.employees.find((e) => e.employeeId === emp1);
      expect(bernardo).toBeDefined();
      expect(bernardo?.salesCount).toBe(2);
      expect(bernardo?.totalSalesValue).toBe(3000);
      expect(bernardo?.totalCommission).toBe(150);

      const aline = body.employees.find((e) => e.employeeId === emp2);
      expect(aline).toBeDefined();
      expect(aline?.salesCount).toBe(0);
      expect(aline?.totalSalesValue).toBe(0);
      expect(aline?.totalCommission).toBe(0);
    });

    it('Critério 2: visualiza ranking de vendas ordenado por valor e por volume', async () => {
      const empA = await createTestEmployee('Vendedor A');
      const empB = await createTestEmployee('Vendedor B');

      // A sells more in value; B sells more in volume.
      await insertSoldOrder(
        empA,
        5000,
        250,
        new Date('2026-10-10T12:00:00.000Z'),
      );

      await insertSoldOrder(
        empB,
        1000,
        50,
        new Date('2026-10-11T12:00:00.000Z'),
      );
      await insertSoldOrder(
        empB,
        1000,
        50,
        new Date('2026-10-12T12:00:00.000Z'),
      );
      await insertSoldOrder(
        empB,
        1000,
        50,
        new Date('2026-10-13T12:00:00.000Z'),
      );

      const resValue = await request(app.getHttpServer())
        .get('/sales-rankings')
        .set('Authorization', `Bearer ${managerToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(200);

      const bodyValue = resValue.body as SalesRankingResponseDto;
      const rankA = bodyValue.ranking.find((r) => r.employeeId === empA);
      const rankB = bodyValue.ranking.find((r) => r.employeeId === empB);
      expect(rankA).toBeDefined();
      expect(rankB).toBeDefined();
      expect(rankA!.position).toBeLessThan(rankB!.position);
      expect(rankA!.totalSalesValue).toBe(5000);
      expect(rankA!.averageTicket).toBe(5000);
      expect(rankB!.totalSalesValue).toBe(3000);
      expect(rankB!.averageTicket).toBe(1000);

      const resVolume = await request(app.getHttpServer())
        .get('/sales-rankings')
        .set('Authorization', `Bearer ${managerToken}`)
        .query({
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          orderBy: 'volume',
        })
        .expect(200);

      const bodyVolume = resVolume.body as SalesRankingResponseDto;
      const rankVolumeA = bodyVolume.ranking.find((r) => r.employeeId === empA);
      const rankVolumeB = bodyVolume.ranking.find((r) => r.employeeId === empB);
      expect(rankVolumeB!.position).toBeLessThan(rankVolumeA!.position);
      expect(rankVolumeB!.salesCount).toBe(3);
      expect(rankVolumeA!.salesCount).toBe(1);
    });

    it('Critério 3: exporta relatórios de comissão e ranking em planilha CSV para download', async () => {
      const emp = await createTestEmployee('Vendedor Exportação');
      await insertSoldOrder(
        emp,
        2500,
        125,
        new Date('2026-10-08T12:00:00.000Z'),
      );

      const resReport = await request(app.getHttpServer())
        .get('/commissions/report/export')
        .set('Authorization', `Bearer ${managerToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(200);

      expect(resReport.header['content-type']).toContain('text/csv');
      expect(resReport.header['content-disposition']).toContain(
        'attachment; filename="relatorio-comissoes-2026-10-01-a-2026-10-31.csv"',
      );
      expect(resReport.text.startsWith('\uFEFF')).toBe(true);
      expect(resReport.text).toContain(
        'Nome do Funcionário;E-mail;Total de Vendas',
      );
      expect(resReport.text).toContain('Vendedor Exportação');

      const resRanking = await request(app.getHttpServer())
        .get('/sales-rankings/export')
        .set('Authorization', `Bearer ${managerToken}`)
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(200);

      expect(resRanking.header['content-type']).toContain('text/csv');
      expect(resRanking.header['content-disposition']).toContain(
        'attachment; filename="ranking-vendas-2026-10-01-a-2026-10-31.csv"',
      );
      expect(resRanking.text.startsWith('\uFEFF')).toBe(true);
      expect(resRanking.text).toContain(
        'Posição;Nome do Funcionário;E-mail;Quantidade de Vendas',
      );
      expect(resRanking.text).toContain('Vendedor Exportação');
    });
  });

  describe('Validações de entrada e tratamento de erros (parametrized)', () => {
    it.each([
      ['/commissions/report', 'sem datas', {}],
      [
        '/commissions/report',
        'formato inválido',
        { startDate: '01/10/2026', endDate: '2026-10-31' },
      ],
      ['/sales-rankings', 'sem datas', {}],
      [
        '/sales-rankings',
        'orderBy inválido',
        { startDate: '2026-10-01', endDate: '2026-10-31', orderBy: 'invalido' },
      ],
      [
        '/commissions/report/export',
        'datas invertidas',
        { startDate: '2026-10-31', endDate: '2026-10-01' },
      ],
      [
        '/sales-rankings/export',
        'data inexistente',
        { startDate: '2026-02-30', endDate: '2026-03-31' },
      ],
    ])(
      'rejeita requisição inválida em %s (%s)',
      async (endpoint, _scenario, query) => {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${managerToken}`)
          .query(query)
          .expect(400);
      },
    );
  });
});
