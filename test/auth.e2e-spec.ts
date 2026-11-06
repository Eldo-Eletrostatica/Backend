import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { CSRF_TOKEN_MISMATCH_MESSAGE } from '../src/auth/guards/jwt-auth.guard';
import {
  MAX_LOGIN_ATTEMPTS_PER_ACCOUNT,
  MAX_LOGIN_ATTEMPTS_PER_IP,
  TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
} from '../src/auth/login-attempts.service';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { signJwt } from '../src/auth/jwt-token';
import { hashPassword } from '../src/auth/password-hash';
import { CSRF_COOKIE, SESSION_COOKIE } from '../src/auth/session-cookies';
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

  function findSetCookie(
    response: request.Response,
    cookieName: string,
  ): string | undefined {
    const setCookies = ([] as string[]).concat(
      response.headers['set-cookie'] ?? [],
    );
    return setCookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  }

  // A distinct client IP per test, as the Frontend proxy reports it, keeps the
  // per-IP login limit of one test from affecting the others.
  function randomClientIp(): string {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    return `10.${octet()}.${octet()}.${octet()}`;
  }

  function postLogin(
    body: { email: string; password: string },
    clientIp = randomClientIp(),
  ): request.Test {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', clientIp)
      .send(body);
  }

  // The cookies as the browser sends them back: only name=value.
  async function login(email: string, password: string): Promise<Session> {
    const res = await postLogin({ email, password }).expect(200);
    const [sessionCookie, csrfCookie] = [SESSION_COOKIE, CSRF_COOKIE].map(
      (cookieName) => (findSetCookie(res, cookieName) ?? '').split(';')[0],
    );
    return {
      accessToken: (res.body as LoginResponseDto).accessToken,
      sessionCookie,
      csrfCookie,
      csrfToken: csrfCookie.slice(`${CSRF_COOKIE}=`.length),
    };
  }

  type Session = {
    accessToken: string;
    sessionCookie: string;
    csrfCookie: string;
    csrfToken: string;
  };
  type Credential = 'cookie' | 'bearer' | 'forgedCookie';
  type CsrfHeader = 'none' | 'wrong' | 'forged' | 'login';

  const FORGED_CSRF_TOKEN = 'forjado';

  const credentialHeaders: Record<
    Credential,
    (session: Session) => Record<string, string>
  > = {
    cookie: (session) => ({
      Cookie: `${session.sessionCookie}; ${session.csrfCookie}`,
    }),
    bearer: (session) => ({ Authorization: `Bearer ${session.accessToken}` }),
    forgedCookie: (session) => ({
      Cookie: `${session.sessionCookie}; ${CSRF_COOKIE}=${FORGED_CSRF_TOKEN}`,
    }),
  };

  const csrfHeaders: Record<
    CsrfHeader,
    (session: Session) => Record<string, string>
  > = {
    none: () => ({}),
    wrong: () => ({ 'X-CSRF-Token': 'outro-valor' }),
    forged: () => ({ 'X-CSRF-Token': FORGED_CSRF_TOKEN }),
    login: (session) => ({ 'X-CSRF-Token': session.csrfToken }),
  };

  it('Critério 1: autentica credenciais válidas e permite consultar a sessão em /auth/me', async () => {
    const seeded = await seedEmployee(EmployeeRole.Manager, 'Gestor@2026');

    const loginRes = await postLogin({
      email: seeded.email,
      password: seeded.password,
    }).expect(200);

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
    [SESSION_COOKIE, true],
    [CSRF_COOKIE, false],
  ])(
    'ADR 0007: o login grava o cookie %s (HttpOnly: %s) por 8 horas, só para o próprio site',
    async (cookieName, isHttpOnly) => {
      const seeded = await seedEmployee();

      const loginRes = await postLogin({
        email: seeded.email,
        password: seeded.password,
      }).expect(200);

      const cookie = findSetCookie(loginRes, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/; Max-Age=28800;/);
      expect(cookie).toMatch(/; Path=\/;/);
      expect(cookie).toMatch(/; SameSite=Strict/);
      expect(/; HttpOnly/.test(cookie ?? '')).toBe(isHttpOnly);
    },
  );

  it.each<[string, Credential]>([
    ['cookie de sessão', 'cookie'],
    ['header Bearer', 'bearer'],
  ])(
    'ADR 0007: /auth/me aceita a sessão pelo %s (%s)',
    async (_credential, credential) => {
      const seeded = await seedEmployee();
      const session = await login(seeded.email, seeded.password);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set(credentialHeaders[credential](session))
        .expect(200);
      expect((res.body as AuthenticatedEmployeeDto).employeeId).toBe(
        seeded.employeeId,
      );
    },
  );

  it.each([
    ['adulterado', 'tampered'],
    ['expirado', 'expired'],
  ])(
    'ADR 0007: bloqueia /auth/me com cookie de sessão %s (%s)',
    async (_reason, tokenProblem) => {
      const seeded = await seedEmployee();
      const claims = {
        sub: seeded.employeeId,
        email: seeded.email,
        role: EmployeeRole.Employee,
        csrf: 'csrf-token-de-teste',
      };
      const secret = app.get(ConfigService).getOrThrow<string>('JWT_SECRET');
      const nowSeconds = Math.floor(Date.now() / 1000);
      const token =
        tokenProblem === 'tampered'
          ? signJwt({ ...claims, role: EmployeeRole.Admin }, 'outro-segredo')
          : signJwt(claims, secret, 60, nowSeconds - 3600);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .expect(401);
      expect((res.body as { message: string }).message).toBe(
        UNAUTHORIZED_MESSAGE,
      );
    },
  );

  // The JWT has no server-side state: logout only makes the browser drop the
  // cookies, and a copied token stays valid until it expires.
  it.each([
    [SESSION_COOKIE, true],
    [CSRF_COOKIE, false],
  ])(
    'ADR 0007: o logout manda o navegador apagar o cookie %s (HttpOnly: %s)',
    async (cookieName, isHttpOnly) => {
      const seeded = await seedEmployee();
      const session = await login(seeded.email, seeded.password);

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set(credentialHeaders.cookie(session))
        .expect(204);

      const cookie = findSetCookie(res, cookieName);
      expect(cookie).toMatch(new RegExp(`^${cookieName}=;`));
      expect(cookie).toMatch(/; Path=\/;/);
      expect(cookie).toMatch(/; Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
      expect(/; HttpOnly/.test(cookie ?? '')).toBe(isHttpOnly);
    },
  );

  // The empty body fails validation (400), which only runs once the guard lets
  // the request through, so no item is created.
  it.each<[string, Credential, CsrfHeader, number]>([
    ['pelo cookie sem X-CSRF-Token', 'cookie', 'none', 403],
    ['pelo cookie com X-CSRF-Token diferente', 'cookie', 'wrong', 403],
    [
      'pelo cookie com cookie e header CSRF forjados iguais',
      'forgedCookie',
      'forged',
      403,
    ],
    ['pelo cookie com o X-CSRF-Token do login', 'cookie', 'login', 400],
    ['pelo Bearer sem X-CSRF-Token', 'bearer', 'none', 400],
  ])(
    'ADR 0007: uma escrita autenticada %s (%s, CSRF %s) responde %s',
    async (_scenario, credential, csrfHeader, expectedStatus) => {
      const seeded = await seedEmployee();
      const session = await login(seeded.email, seeded.password);

      const res = await request(app.getHttpServer())
        .post('/inventory-items')
        .set({
          ...credentialHeaders[credential](session),
          ...csrfHeaders[csrfHeader](session),
        })
        .send({})
        .expect(expectedStatus);
      if (expectedStatus === 403) {
        expect((res.body as { message: string }).message).toBe(
          CSRF_TOKEN_MISMATCH_MESSAGE,
        );
      }
    },
  );

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

      const res = await postLogin({
        email: emailAttempt,
        password: passwordAttempt,
      }).expect(401);

      const body = res.body as { message: string };
      expect(body.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    },
  );

  function randomEmail(): string {
    return `outra-${randomUUID().slice(0, 8)}@eldo.com.br`;
  }

  function expectTooManyAttempts(res: request.Response): void {
    if (res.status === 429) {
      expect((res.body as { message: string }).message).toBe(
        TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
      );
    }
  }

  it.each<[string, 'same' | 'uppercase' | 'other', boolean, number]>([
    ['da mesma conta e do mesmo IP', 'same', true, 429],
    [
      'da mesma conta em maiúsculas e com espaços, do mesmo IP',
      'uppercase',
      true,
      429,
    ],
    ['de outra conta, do mesmo IP', 'other', true, 401],
    ['da mesma conta, de outro IP', 'same', false, 401],
  ])(
    'limita o login a 5 erros por minuto por conta e IP: a 6ª tentativa %s (%s, mesmo IP: %s) responde %s',
    async (_scenario, emailVariant, isSameIp, expectedStatus) => {
      const seeded = await seedEmployee();
      const attackerIp = randomClientIp();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS_PER_ACCOUNT; i++) {
        await postLogin(
          { email: seeded.email, password: 'SenhaErrada@1' },
          attackerIp,
        ).expect(401);
      }
      const email = {
        same: seeded.email,
        uppercase: `  ${seeded.email.toUpperCase()} `,
        other: randomEmail(),
      }[emailVariant];

      const res = await postLogin(
        { email, password: 'SenhaErrada@1' },
        isSameIp ? attackerIp : randomClientIp(),
      ).expect(expectedStatus);
      expectTooManyAttempts(res);
    },
  );

  it.each([
    ['do mesmo IP', true, 429],
    ['de outro IP', false, 401],
  ])(
    'limita o login a 20 erros por minuto por IP, em contas diferentes: a 21ª tentativa %s (%s) responde %s',
    async (_scenario, isSameIp, expectedStatus) => {
      const attackerIp = randomClientIp();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS_PER_IP; i++) {
        await postLogin(
          { email: randomEmail(), password: 'SenhaErrada@1' },
          attackerIp,
        ).expect(401);
      }

      const res = await postLogin(
        { email: randomEmail(), password: 'SenhaErrada@1' },
        isSameIp ? attackerIp : randomClientIp(),
      ).expect(expectedStatus);
      expectTooManyAttempts(res);
    },
  );

  // E = wrong password (401), C = correct password (200).
  it.each([
    ['5 acertos seguidos', 'CCCCC', 200],
    ['4 erros, 1 acerto e mais 4 erros', 'EEEECEEEE', 200],
    ['5 erros seguidos', 'EEEEE', 429],
  ])(
    'só os erros contam no limite da conta, e um acerto os zera: depois de %s (%s), o próximo login certo responde %s',
    async (_scenario, attempts, expectedStatus) => {
      const seeded = await seedEmployee();
      const clientIp = randomClientIp();
      for (const attempt of attempts) {
        const isCorrect = attempt === 'C';
        await postLogin(
          {
            email: seeded.email,
            password: isCorrect ? seeded.password : 'SenhaErrada@1',
          },
          clientIp,
        ).expect(isCorrect ? 200 : 401);
      }

      const res = await postLogin(
        { email: seeded.email, password: seeded.password },
        clientIp,
      ).expect(expectedStatus);
      expectTooManyAttempts(res);
    },
  );

  it.each([
    ['20 logins certos', true, 200],
    ['20 erros', false, 429],
  ])(
    'só os erros contam no limite do IP: depois de %s em contas diferentes do mesmo IP (%s), o 21º login certo responde %s',
    async (_scenario, isCorrect, expectedStatus) => {
      const clientIp = randomClientIp();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS_PER_IP; i++) {
        const seeded = await seedEmployee();
        await postLogin(
          {
            email: seeded.email,
            password: isCorrect ? seeded.password : 'SenhaErrada@1',
          },
          clientIp,
        ).expect(isCorrect ? 200 : 401);
      }

      const seeded = await seedEmployee();
      const res = await postLogin(
        { email: seeded.email, password: seeded.password },
        clientIp,
      ).expect(expectedStatus);
      expectTooManyAttempts(res);
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
