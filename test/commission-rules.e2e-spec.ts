import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CommissionRuleResponseDto } from '../src/commission-rules/dto/commission-rule-response.dto';
import {
  CommissionCalculationType,
  CommissionScope,
} from '../src/commission-rules/entities/commission-rule.entity';
import { EmployeeRole } from '../src/employees/entities/employee.entity';

describe('Regras de Comissão (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const created = {
    employeeIds: [] as string[],
    ruleIds: [] as string[],
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
    if (created.ruleIds.length > 0) {
      await dataSource.query(
        `DELETE FROM commission_rules WHERE commission_rule_id = ANY($1)`,
        [created.ruleIds],
      );
      created.ruleIds = [];
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

  async function createTestEmployee(
    role: EmployeeRole = EmployeeRole.Employee,
  ): Promise<string> {
    const employeeId = randomUUID();
    const email = `test-${employeeId.slice(0, 8)}@eldo.com.br`;
    await dataSource.query(
      `INSERT INTO employees (employee_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, 'hash', $4)`,
      [employeeId, `Funcionario ${employeeId.slice(0, 4)}`, email, role],
    );
    created.employeeIds.push(employeeId);
    return employeeId;
  }

  describe('RBAC - Proteção por Perfil de Administrador', () => {
    it.each([
      [{}, 403, 'sem headers de autenticação'],
      [{ 'x-user-role': 'employee' }, 403, 'com papel de funcionário comum'],
      [{ 'x-user-role': 'manager' }, 403, 'com papel de gestor'],
    ])(
      'rejeita criação com código %s quando %s',
      async (headers, expectedStatus) => {
        await request(app.getHttpServer())
          .post('/commission-rules')
          .set(headers)
          .send({
            name: 'Regra Teste',
            calculationType: CommissionCalculationType.Percentage,
            value: 5,
            scope: CommissionScope.Global,
          })
          .expect(expectedStatus);
      },
    );

    it.each([
      [{ 'x-user-role': 'admin' }, 'header x-user-role: admin'],
      [
        { 'x-employee-id': 'ADMIN_PLACEHOLDER' },
        'header x-employee-id de admin',
      ],
    ])(
      'permite criação quando autenticado como admin (%s)',
      async (headers) => {
        let activeHeaders = { ...headers };
        if (headers['x-employee-id'] === 'ADMIN_PLACEHOLDER') {
          const adminId = await createTestEmployee(EmployeeRole.Admin);
          activeHeaders = { 'x-employee-id': adminId };
        }

        const res = await request(app.getHttpServer())
          .post('/commission-rules')
          .set(activeHeaders)
          .send({
            name: 'Regra Admin Válida',
            calculationType: CommissionCalculationType.Percentage,
            value: 4,
            scope: CommissionScope.Global,
            minAmount: 0,
            maxAmount: 1000,
          })
          .expect(201);

        const body = res.body as CommissionRuleResponseDto;
        created.ruleIds.push(body.commissionRuleId);
        expect(body.name).toBe('Regra Admin Válida');
      },
    );
  });

  describe('Cenário 1: Cadastro de regra percentual por faixa global', () => {
    it('cadastra regra global de 3% para faixa de R$ 0,00 a R$ 5.000,00', async () => {
      const res = await request(app.getHttpServer())
        .post('/commission-rules')
        .set({ 'x-user-role': 'admin' })
        .send({
          name: 'Global 0 a 5k',
          scope: CommissionScope.Global,
          minAmount: 0,
          maxAmount: 5000,
          calculationType: CommissionCalculationType.Percentage,
          value: 3,
        })
        .expect(201);

      const body = res.body as CommissionRuleResponseDto;
      created.ruleIds.push(body.commissionRuleId);

      expect(body).toMatchObject({
        name: 'Global 0 a 5k',
        scope: CommissionScope.Global,
        employeeId: null,
        minAmount: 0,
        maxAmount: 5000,
        calculationType: CommissionCalculationType.Percentage,
        value: 3,
        isActive: true,
      });
      expect(body.commissionRuleId).toBeDefined();
    });
  });

  describe('Cenário 2: Cadastro de regra específica por funcionário com valor fixo', () => {
    it('configura comissão de valor fixo de R$ 80,00 para funcionário acima de R$ 10.000,00', async () => {
      const joaoId = await createTestEmployee();

      const res = await request(app.getHttpServer())
        .post('/commission-rules')
        .set({ 'x-user-role': 'admin' })
        .send({
          name: 'Fixo João Vendas Grandes',
          scope: CommissionScope.Employee,
          employeeId: joaoId,
          minAmount: 10000.01,
          calculationType: CommissionCalculationType.Fixed,
          value: 80,
        })
        .expect(201);

      const body = res.body as CommissionRuleResponseDto;
      created.ruleIds.push(body.commissionRuleId);

      expect(body).toMatchObject({
        name: 'Fixo João Vendas Grandes',
        scope: CommissionScope.Employee,
        employeeId: joaoId,
        minAmount: 10000.01,
        maxAmount: null,
        calculationType: CommissionCalculationType.Fixed,
        value: 80,
        isActive: true,
      });
    });
  });

  describe('Cenário 3: Validação de conflito de faixas', () => {
    it('rejeita cadastro de faixa sobreposta para o mesmo escopo', async () => {
      // Regra 1: R$ 1.000,00 a R$ 3.000,00
      const initial = await request(app.getHttpServer())
        .post('/commission-rules')
        .set({ 'x-user-role': 'admin' })
        .send({
          name: 'Faixa 1k a 3k',
          scope: CommissionScope.Global,
          minAmount: 1000,
          maxAmount: 3000,
          calculationType: CommissionCalculationType.Percentage,
          value: 4,
        })
        .expect(201);

      const initialBody = initial.body as CommissionRuleResponseDto;
      created.ruleIds.push(initialBody.commissionRuleId);

      // Regra 2: R$ 2.000,00 a R$ 4.000,00 (sobrepõe)
      const conflictRes = await request(app.getHttpServer())
        .post('/commission-rules')
        .set({ 'x-user-role': 'admin' })
        .send({
          name: 'Faixa 2k a 4k Conflitante',
          scope: CommissionScope.Global,
          minAmount: 2000,
          maxAmount: 4000,
          calculationType: CommissionCalculationType.Percentage,
          value: 5,
        })
        .expect(409);

      const conflictBody = conflictRes.body as { message: string };
      expect(conflictBody.message).toContain(
        'Existe sobreposição de faixas de valores para o escopo informado.',
      );
    });
  });

  describe('Cenário 4: Cálculo da comissão e operações completas', () => {
    it('permite listar, buscar por ID, atualizar e soft delete da regra', async () => {
      // Criação
      const createRes = await request(app.getHttpServer())
        .post('/commission-rules')
        .set({ 'x-user-role': 'admin' })
        .send({
          name: 'Regra Ciclo Completo',
          scope: CommissionScope.Global,
          minAmount: 0,
          maxAmount: 2000,
          calculationType: CommissionCalculationType.Percentage,
          value: 2.5,
        })
        .expect(201);

      const body = createRes.body as CommissionRuleResponseDto;
      const ruleId = body.commissionRuleId;
      created.ruleIds.push(ruleId);

      // Listagem
      const listRes = await request(app.getHttpServer())
        .get('/commission-rules')
        .set({ 'x-user-role': 'admin' })
        .query({ scope: CommissionScope.Global })
        .expect(200);

      const list = listRes.body as CommissionRuleResponseDto[];
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((r) => r.commissionRuleId === ruleId)).toBe(true);

      // Busca por ID
      const getRes = await request(app.getHttpServer())
        .get(`/commission-rules/${ruleId}`)
        .set({ 'x-user-role': 'admin' })
        .expect(200);

      const getBody = getRes.body as CommissionRuleResponseDto;
      expect(getBody.name).toBe('Regra Ciclo Completo');

      // Atualização
      const updateRes = await request(app.getHttpServer())
        .patch(`/commission-rules/${ruleId}`)
        .set({ 'x-user-role': 'admin' })
        .send({ name: 'Regra Atualizada', value: 3.5 })
        .expect(200);

      const updateBody = updateRes.body as CommissionRuleResponseDto;
      expect(updateBody.name).toBe('Regra Atualizada');
      expect(updateBody.value).toBe(3.5);

      // Soft delete
      await request(app.getHttpServer())
        .delete(`/commission-rules/${ruleId}`)
        .set({ 'x-user-role': 'admin' })
        .expect(204);

      // Após soft delete, busca direta deve retornar 404
      await request(app.getHttpServer())
        .get(`/commission-rules/${ruleId}`)
        .set({ 'x-user-role': 'admin' })
        .expect(404);
    });
  });
});
