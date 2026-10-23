import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { FORBIDDEN_ROLE_MESSAGE } from '../src/auth/guards/roles.guard';
import { hashPassword } from '../src/auth/password-hash';
import { EmployeeResponseDto } from '../src/employees/dto/employee-response.dto';
import { EMAIL_IN_USE_MESSAGE } from '../src/employees/employees.service';
import {
  CommissionType,
  EmployeeRole,
} from '../src/employees/entities/employee.entity';

describe('Cadastro e Permissões de Funcionários (e2e) - US10', () => {
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

  async function seedEmployee(
    role: EmployeeRole = EmployeeRole.Employee,
    password = 'SenhaValida@123',
  ): Promise<{ employeeId: string; email: string; password: string }> {
    const employeeId = randomUUID();
    const email = `func-${employeeId.slice(0, 8)}@eldo.com.br`;
    const passwordHash = await hashPassword(password);

    await dataSource.query(
      `INSERT INTO employees (employee_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        employeeId,
        `Funcionário ${employeeId.slice(0, 4)}`,
        email,
        passwordHash,
        role,
      ],
    );
    created.employeeIds.push(employeeId);
    return { employeeId, email, password };
  }

  async function loginAs(
    role: EmployeeRole,
  ): Promise<{ token: string; employeeId: string; email: string }> {
    const seeded = await seedEmployee(role);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: seeded.email, password: seeded.password })
      .expect(200);
    const body = res.body as LoginResponseDto;
    return {
      token: body.accessToken,
      employeeId: seeded.employeeId,
      email: seeded.email,
    };
  }

  function randomDocument(): string {
    return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
  }

  async function insertSoldOrderForSeller(
    sellerEmployeeId: string,
  ): Promise<string> {
    const customerId = randomUUID();
    await dataSource.query(
      `INSERT INTO customers (customer_id, type, name, document, email, phone)
       VALUES ($1, 'business', 'ACME Industrial', $2, $3, '61999999999')`,
      [customerId, randomDocument(), `acme-${customerId.slice(0, 8)}@test.com`],
    );
    created.customerIds.push(customerId);

    const orderId = randomUUID();
    const trackingCode = `K${randomInt(1000000, 9999999)}`;
    await dataSource.query(
      `INSERT INTO orders (
         order_id, customer_id, seller_employee_id, source, status,
         final_price, commission, sold_at, tracking_code, scope, due_date
       ) VALUES ($1, $2, $3, 'internal', 'queued', 1200, 60, NOW(), $4, 'Pintura epóxi', '2030-05-10')`,
      [orderId, customerId, sellerEmployeeId, trackingCode],
    );
    created.orderIds.push(orderId);
    return orderId;
  }

  it.each([
    [EmployeeRole.Admin, 'Administrador'],
    [EmployeeRole.Manager, 'Gestor'],
    [EmployeeRole.Employee, 'Funcionário'],
  ])(
    'Critério 1: administrador cadastra novo funcionário com nível %s (%s) e ele aparece na listagem',
    async (targetRole, roleLabel) => {
      const { token: adminToken } = await loginAs(EmployeeRole.Admin);
      const newEmail = `novo-${randomUUID().slice(0, 8)}@eldo.com.br`;

      const createRes = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Conta ${roleLabel}`,
          email: newEmail,
          password: 'SenhaInicial@123',
          role: targetRole,
        })
        .expect(201);

      const createdEmployee = createRes.body as EmployeeResponseDto;
      created.employeeIds.push(createdEmployee.employeeId);

      expect(createdEmployee.name).toBe(`Conta ${roleLabel}`);
      expect(createdEmployee.email).toBe(newEmail);
      expect(createdEmployee.role).toBe(targetRole);
      expect(createdEmployee).not.toHaveProperty('passwordHash');

      const listRes = await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const list = listRes.body as EmployeeResponseDto[];
      const found = list.find(
        (item) => item.employeeId === createdEmployee.employeeId,
      );
      expect(found).toBeDefined();
      expect(found?.role).toBe(targetRole);
    },
  );

  it.each([
    [
      EmployeeRole.Employee,
      'configurar regras de comissão',
      'PATCH',
      'commission-rule',
    ],
    [EmployeeRole.Employee, 'cadastrar novo funcionário', 'POST', 'employees'],
    [
      EmployeeRole.Manager,
      'configurar regras de comissão',
      'PATCH',
      'commission-rule',
    ],
    [EmployeeRole.Manager, 'listar funcionários', 'GET', 'employees'],
  ])(
    'Critério 2: nega acesso com 403 quando nível de acesso %s tenta %s (%s %s)',
    async (callerRole, _actionDescription, method, targetEndpoint) => {
      const { token, employeeId } = await loginAs(callerRole);

      let res: request.Response;
      if (targetEndpoint === 'commission-rule' && method === 'PATCH') {
        res = await request(app.getHttpServer())
          .patch(`/employees/${employeeId}/commission-rule`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            commissionType: CommissionType.Percentage,
            commissionValue: 10,
          })
          .expect(403);
      } else if (targetEndpoint === 'employees' && method === 'POST') {
        res = await request(app.getHttpServer())
          .post('/employees')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Tentativa Sem Permissão',
            email: `sem-perm-${randomUUID().slice(0, 8)}@eldo.com.br`,
            password: 'Senha@123',
            role: EmployeeRole.Employee,
          })
          .expect(403);
      } else {
        res = await request(app.getHttpServer())
          .get('/employees')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      }

      const body = res.body as { message: string };
      expect(body.message).toBe(FORBIDDEN_ROLE_MESSAGE);
    },
  );

  it('Critério 3: rejeita com 409 o cadastro de funcionário com e-mail já em uso', async () => {
    const { token: adminToken } = await loginAs(EmployeeRole.Admin);
    const existing = await seedEmployee(EmployeeRole.Employee);

    const res = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Outro Funcionário',
        email: existing.email.toUpperCase(),
        password: 'Senha@123',
        role: EmployeeRole.Employee,
      })
      .expect(409);

    const body = res.body as { message: string };
    expect(body.message).toBe(EMAIL_IN_USE_MESSAGE);
  });

  it('Critério 4: remove logicamente um funcionário com vendas registradas, ocultando-o da lista e preservando o vendedor nas vendas antigas', async () => {
    const { token: adminToken } = await loginAs(EmployeeRole.Admin);
    const seller = await seedEmployee(EmployeeRole.Employee, 'Vendedor@123');
    const orderId = await insertSoldOrderForSeller(seller.employeeId);

    await request(app.getHttpServer())
      .delete(`/employees/${seller.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const listRes = await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const activeEmployees = listRes.body as EmployeeResponseDto[];
    expect(
      activeEmployees.some((emp) => emp.employeeId === seller.employeeId),
    ).toBe(false);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: seller.email, password: seller.password })
      .expect(401);

    // Past sales still reference the soft-deleted employee row (ADR 0002).
    const [historicalSale] = await dataSource.query<
      { seller_employee_id: string; seller_name: string }[]
    >(
      `SELECT o.seller_employee_id, e.name AS seller_name
         FROM orders o
         JOIN employees e ON e.employee_id = o.seller_employee_id
        WHERE o.order_id = $1`,
      [orderId],
    );
    expect(historicalSale.seller_employee_id).toBe(seller.employeeId);
    expect(historicalSale.seller_name).toContain('Funcionário');

    // Partial unique index allows reusing the email of a removed employee.
    const reusedRes = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Novo Contratado',
        email: seller.email,
        password: 'NovaSenha@123',
        role: EmployeeRole.Employee,
      })
      .expect(201);
    created.employeeIds.push(
      (reusedRes.body as EmployeeResponseDto).employeeId,
    );
  });

  it('permite consultar e atualizar o cadastro e o nível de acesso de um funcionário', async () => {
    const { token: adminToken } = await loginAs(EmployeeRole.Admin);
    const target = await seedEmployee(EmployeeRole.Employee, 'Antiga@123');

    const updateRes = await request(app.getHttpServer())
      .patch(`/employees/${target.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nome Promovido',
        role: EmployeeRole.Manager,
        password: 'NovaSenha@789',
      })
      .expect(200);

    const updated = updateRes.body as EmployeeResponseDto;
    expect(updated.name).toBe('Nome Promovido');
    expect(updated.role).toBe(EmployeeRole.Manager);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: target.email, password: 'NovaSenha@789' })
      .expect(200);
  });
});
