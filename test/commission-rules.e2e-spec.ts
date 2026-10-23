import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { signJwt } from '../src/auth/jwt-token';
import { CommissionRuleResponseDto } from '../src/commission-rules/dto/commission-rule-response.dto';
import {
  CommissionType,
  EmployeeRole,
} from '../src/employees/entities/employee.entity';

describe('Regras de Comissão (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;

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
  });

  beforeEach(async () => {
    const adminId = await createTestEmployee(EmployeeRole.Admin);
    adminToken = signJwt(
      {
        sub: adminId,
        email: `admin-${adminId.slice(0, 8)}@eldo.com.br`,
        role: EmployeeRole.Admin,
      },
      process.env.JWT_SECRET || 'eldo-dev-jwt-secret',
    );
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
    await app.close();
  });

  async function createTestEmployee(
    role: EmployeeRole = EmployeeRole.Employee,
  ): Promise<string> {
    const employeeId = randomUUID();
    const email = `test-${employeeId.slice(0, 8)}@eldo.com.br`;
    await dataSource.query(
      `INSERT INTO employees (employee_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, 'hash', $4)`,
      [employeeId, `Vendedor ${employeeId.slice(0, 4)}`, email, role],
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

  describe('Configuração de regra de comissão (US22 / ADR 0005)', () => {
    it('configura regra de comissão percentual no cadastro do funcionário', async () => {
      const employeeId = await createTestEmployee();

      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commissionType: CommissionType.Percentage,
          commissionValue: 5,
        })
        .expect(200);

      const body = res.body as CommissionRuleResponseDto;
      expect(body.employeeId).toBe(employeeId);
      expect(body.commissionType).toBe(CommissionType.Percentage);
      expect(body.commissionValue).toBe(5);

      const getRes = await request(app.getHttpServer())
        .get(`/employees/${employeeId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const getBody = getRes.body as CommissionRuleResponseDto;
      expect(getBody.commissionType).toBe(CommissionType.Percentage);
      expect(getBody.commissionValue).toBe(5);
    });

    it('configura regra de comissão de valor fixo no cadastro do funcionário', async () => {
      const employeeId = await createTestEmployee();

      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commissionType: CommissionType.Fixed,
          commissionValue: 80,
        })
        .expect(200);

      const body = res.body as CommissionRuleResponseDto;
      expect(body.commissionType).toBe(CommissionType.Fixed);
      expect(body.commissionValue).toBe(80);
    });

    it('remove a regra de comissão enviando null em ambos os campos', async () => {
      const employeeId = await createTestEmployee();

      // Primeiro define uma regra
      await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commissionType: CommissionType.Percentage,
          commissionValue: 3,
        })
        .expect(200);

      // Depois limpa a regra
      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commissionType: null,
          commissionValue: null,
        })
        .expect(200);

      const body = res.body as CommissionRuleResponseDto;
      expect(body.commissionType).toBeNull();
      expect(body.commissionValue).toBeNull();
    });

    it('preserva a comissão de vendas já lançadas ao alterar a regra do vendedor (critério 4 da US22)', async () => {
      // 1. Configura regra inicial de 5% para o vendedor
      const employeeId = await createTestEmployee();
      await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commissionType: CommissionType.Percentage,
          commissionValue: 5,
        })
        .expect(200);

      // 2. Lança venda de R$ 1.000,00 (comissão esperada: 5% de 1000 = R$ 50,00)
      const orderId = await insertApprovedOrder(1000);
      const saleRes = await request(app.getHttpServer())
        .post('/sales')
        .send({
          orderId,
          sellerEmployeeId: employeeId,
          scope: 'Pintura de 20 portões em epóxi',
          dueDate: '2030-01-15',
        })
        .expect(201);

      const saleBody = saleRes.body as { commission: number };
      expect(saleBody.commission).toBe(50);

      // 3. Altera a regra do vendedor para valor fixo de R$ 80,00
      await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commissionType: CommissionType.Fixed,
          commissionValue: 80,
        })
        .expect(200);

      // 4. Confere no banco de dados que a comissão da venda anterior continua R$ 50,00 (ADR 0003)
      const [firstOrder] = await dataSource.query<{ commission: string }[]>(
        `SELECT commission FROM orders WHERE order_id = $1`,
        [orderId],
      );
      expect(Number(firstOrder.commission)).toBe(50);

      // 5. Nova venda lançada após a alteração utiliza a nova regra fixa (R$ 80,00)
      const secondOrderId = await insertApprovedOrder(1000);
      const secondSaleRes = await request(app.getHttpServer())
        .post('/sales')
        .send({
          orderId: secondOrderId,
          sellerEmployeeId: employeeId,
          scope: 'Pintura de perfis de alumínio',
          dueDate: '2030-01-20',
        })
        .expect(201);

      const secondSaleBody = secondSaleRes.body as { commission: number };
      expect(secondSaleBody.commission).toBe(80);

      // Confere novamente que a venda inicial permanece com a comissão congelada em R$ 50,00
      const [firstOrderCheck] = await dataSource.query<
        {
          commission: string;
        }[]
      >(`SELECT commission FROM orders WHERE order_id = $1`, [orderId]);
      expect(Number(firstOrderCheck.commission)).toBe(50);
    });
  });

  describe('Validações de entrada', () => {
    it.each([
      [CommissionType.Percentage, null, 'tipo sem valor'],
      [null, 50, 'valor sem tipo'],
    ])(
      'rejeita paridade inconsistente (%s, %s): %s',
      async (commissionType, commissionValue) => {
        const employeeId = await createTestEmployee();

        const res = await request(app.getHttpServer())
          .patch(`/employees/${employeeId}/commission-rule`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ commissionType, commissionValue })
          .expect(400);

        const body = res.body as { message: string };
        expect(body.message).toContain(
          'Tipo e valor da comissão devem ser informados juntos ou ambos nulos.',
        );
      },
    );

    it.each([
      [CommissionType.Percentage, 0],
      [CommissionType.Percentage, -10],
      [CommissionType.Fixed, 0],
      [CommissionType.Fixed, -100],
    ])(
      'rejeita valor de comissão menor ou igual a zero (%s para %s)',
      async (commissionType, commissionValue) => {
        const employeeId = await createTestEmployee();

        const res = await request(app.getHttpServer())
          .patch(`/employees/${employeeId}/commission-rule`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ commissionType, commissionValue })
          .expect(400);

        const body = res.body as { message: string };
        expect(body.message).toContain(
          'O valor da comissão deve ser maior que zero.',
        );
      },
    );

    it.each([
      [100.01, 'percentual logo acima de 100%'],
      [150, 'percentual bem acima de 100%'],
    ])(
      'rejeita percentual superior a 100%% (%s: %s)',
      async (commissionValue) => {
        const employeeId = await createTestEmployee();

        const res = await request(app.getHttpServer())
          .patch(`/employees/${employeeId}/commission-rule`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            commissionType: CommissionType.Percentage,
            commissionValue,
          })
          .expect(400);

        const body = res.body as { message: string };
        expect(body.message).toContain(
          'O percentual de comissão não pode exceder 100%.',
        );
      },
    );

    it.each([
      [CommissionType.Fixed, 10_000_000_000, 'acima do teto'],
      [CommissionType.Fixed, 99_999_999_999.99, 'muito acima do teto'],
    ])(
      'rejeita valor de comissão acima do limite máximo de 9.999.999.999,99 (%s, %s): %s',
      async (commissionType, commissionValue) => {
        const employeeId = await createTestEmployee();

        const res = await request(app.getHttpServer())
          .patch(`/employees/${employeeId}/commission-rule`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ commissionType, commissionValue })
          .expect(400);

        const body = res.body as { message: string | string[] };
        expect(JSON.stringify(body.message)).toContain('9999999999.99');
      },
    );

    it('retorna 404 para funcionário inexistente', async () => {
      const nonExistentId = randomUUID();

      await request(app.getHttpServer())
        .patch(`/employees/${nonExistentId}/commission-rule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commissionType: CommissionType.Fixed,
          commissionValue: 50,
        })
        .expect(404);
    });
  });
});
