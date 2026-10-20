import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CommissionRuleResponseDto } from '../src/commission-rules/dto/commission-rule-response.dto';
import {
  CommissionType,
  EmployeeRole,
} from '../src/employees/entities/employee.entity';

describe('Regras de Comissão (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

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

  afterEach(async () => {
    if (created.orderIds.length > 0) {
      await dataSource.query(`DELETE FROM orders WHERE order_id = ANY($1)`, [
        created.orderIds,
      ]);
      created.orderIds = [];
    }

    if (created.customerIds.length > 0) {
      await dataSource.query(
        `DELETE FROM customers WHERE customer_id = ANY($1)`,
        [created.customerIds],
      );
      created.customerIds = [];
    }

    if (created.employeeIds.length > 0) {
      await dataSource.query(
        `DELETE FROM employees WHERE employee_id = ANY($1)`,
        [created.employeeIds],
      );
      created.employeeIds = [];
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTestEmployee(): Promise<string> {
    const employeeId = randomUUID();
    const email = `test-${employeeId.slice(0, 8)}@eldo.com.br`;
    await dataSource.query(
      `INSERT INTO employees (employee_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, 'hash', $4)`,
      [
        employeeId,
        `Vendedor ${employeeId.slice(0, 4)}`,
        email,
        EmployeeRole.Employee,
      ],
    );
    created.employeeIds.push(employeeId);
    return employeeId;
  }

  describe('Configuração de regra de comissão (US22 / ADR 0005)', () => {
    it('configura regra de comissão percentual no cadastro do funcionário', async () => {
      const employeeId = await createTestEmployee();

      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
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
        .expect(200);

      const getBody = getRes.body as CommissionRuleResponseDto;
      expect(getBody.commissionType).toBe(CommissionType.Percentage);
      expect(getBody.commissionValue).toBe(5);
    });

    it('configura regra de comissão de valor fixo no cadastro do funcionário', async () => {
      const employeeId = await createTestEmployee();

      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
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
        .send({
          commissionType: CommissionType.Percentage,
          commissionValue: 3,
        })
        .expect(200);

      // Depois limpa a regra
      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeId}/commission-rule`)
        .send({
          commissionType: null,
          commissionValue: null,
        })
        .expect(200);

      const body = res.body as CommissionRuleResponseDto;
      expect(body.commissionType).toBeNull();
      expect(body.commissionValue).toBeNull();
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
          .send({ commissionType, commissionValue })
          .expect(400);

        const body = res.body as { message: string };
        expect(body.message).toContain(
          'O valor da comissão deve ser maior que zero.',
        );
      },
    );

    it.each([[100.01], [150]])(
      'rejeita percentual superior a 100%% (%s)',
      async (commissionValue) => {
        const employeeId = await createTestEmployee();

        const res = await request(app.getHttpServer())
          .patch(`/employees/${employeeId}/commission-rule`)
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

    it('retorna 404 para funcionário inexistente', async () => {
      const nonExistentId = randomUUID();

      await request(app.getHttpServer())
        .patch(`/employees/${nonExistentId}/commission-rule`)
        .send({
          commissionType: CommissionType.Fixed,
          commissionValue: 50,
        })
        .expect(404);
    });
  });
});
