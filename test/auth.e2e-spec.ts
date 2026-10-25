import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  INVALID_CREDENTIALS_MESSAGE,
  UNAUTHORIZED_MESSAGE,
} from '../src/auth/auth.service';
import { AuthenticatedEmployeeDto } from '../src/auth/dto/authenticated-employee.dto';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { EmployeeRole } from '../src/employees/entities/employee.entity';

describe('Autenticação de Funcionários (e2e) - US09', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const createdEmployeeIds: string[] = [];

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
      `DELETE FROM employees WHERE employee_id = ANY($1)`,
      [createdEmployeeIds],
    );
    createdEmployeeIds.length = 0;
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
    createdEmployeeIds.push(employeeId);
    return { employeeId, email, password };
  }

  it('Critério 1: autentica credenciais válidas e permite consultar a sessão em /auth/me', async () => {
    const seeded = await seedEmployee(EmployeeRole.Manager, 'Gestor@2026');

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: seeded.email, password: seeded.password })
      .expect(200);

    const loginBody = loginRes.body as LoginResponseDto;
    expect(typeof loginBody.accessToken).toBe('string');
    expect(loginBody.employee.employeeId).toBe(seeded.employeeId);
    expect(loginBody.employee.email).toBe(seeded.email);
    expect(loginBody.employee.role).toBe(EmployeeRole.Manager);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const meBody = meRes.body as AuthenticatedEmployeeDto;
    expect(meBody).toEqual(loginBody.employee);
  });

  it.each([
    ['senha incorreta para e-mail existente', true, 'SenhaIncorreta@999'],
    ['e-mail não cadastrado no sistema', false, 'SenhaValida@123'],
  ])(
    'Critério 2: retorna erro 401 com mensagem genérica idêntica quando há %s (%s)',
    async (_scenario, useExistingEmail, passwordAttempt) => {
      const seeded = await seedEmployee(
        EmployeeRole.Employee,
        'SenhaValida@123',
      );
      const emailAttempt = useExistingEmail
        ? seeded.email
        : `inexistente-${randomUUID().slice(0, 8)}@eldo.com.br`;

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailAttempt, password: passwordAttempt })
        .expect(401);

      const body = res.body as { message: string };
      expect(body.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    },
  );

  it.each([
    ['sem cabeçalho Authorization', undefined],
    ['com esquema diferente de Bearer', 'Basic abc123'],
    ['com token inválido', 'Bearer token.jwt.invalido'],
  ])(
    'Critério 3: bloqueia acesso direto a /auth/me %s (%s)',
    async (_reason, authHeader) => {
      const req = request(app.getHttpServer()).get('/auth/me');

      if (authHeader) {
        req.set('Authorization', authHeader);
      }

      const res = await req.expect(401);
      const body = res.body as { message: string };
      expect(body.message).toBe(UNAUTHORIZED_MESSAGE);
    },
  );
});
