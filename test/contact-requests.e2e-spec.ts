import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { ContactRequestResponseDto } from '../src/contact-requests/dto/contact-request-response.dto';
import { EmployeeRole } from '../src/employees/entities/employee.entity';

const PASSWORD = 'Password@123';

describe('Formulário de contato PF (e2e) - US06', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let employeeId: string;
  let employeeToken: string;

  const created = { orderIds: [] as string[] };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    // Any employee of the team handles contact requests, not only managers.
    const email = `atendente-${randomUUID()}@eldo.test`;
    [{ employee_id: employeeId }] = await dataSource.query<
      { employee_id: string }[]
    >(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Atendente Teste', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(PASSWORD), EmployeeRole.Employee],
    );
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    employeeToken = (loginRes.body as LoginResponseDto).accessToken;
  });

  // The customer of a contact request exists only for it, so it goes with the
  // order.
  afterEach(async () => {
    const orders = await dataSource.query<{ customer_id: string }[]>(
      'SELECT customer_id FROM orders WHERE order_id = ANY($1)',
      [created.orderIds],
    );
    await dataSource.query('DELETE FROM orders WHERE order_id = ANY($1)', [
      created.orderIds,
    ]);
    await dataSource.query(
      'DELETE FROM customers WHERE customer_id = ANY($1)',
      [orders.map((order) => order.customer_id)],
    );
    created.orderIds.length = 0;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM employees WHERE employee_id = $1', [
      employeeId,
    ]);
    await app.close();
  });

  function contactForm(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Maria Souza',
      email: 'maria@email.com',
      phone: '61999999999',
      message: 'Quero pintar o portão de casa.',
      ...overrides,
    };
  }

  async function sendContactForm(body: Record<string, unknown>) {
    const res = await request(app.getHttpServer())
      .post('/contact-requests')
      .send(body);
    if (res.status === 201) {
      created.orderIds.push((res.body as ContactRequestResponseDto).orderId);
    }
    return res;
  }

  const asEmployee = () => {
    const server = request(app.getHttpServer());
    const auth = `Bearer ${employeeToken}`;
    return {
      get: (url: string) => server.get(url).set('Authorization', auth),
      patch: (url: string) => server.patch(url).set('Authorization', auth),
    };
  };

  async function listContactRequests(status?: string) {
    const res = await asEmployee()
      .get('/contact-requests')
      .query(status ? { status } : {})
      .expect(200);
    return res.body as ContactRequestResponseDto[];
  }

  describe('Critérios de Aceite da US06', () => {
    it('Critério 1: confirma o envio com os dados do contato', async () => {
      const res = await sendContactForm(contactForm());

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        status: 'requested',
        name: 'Maria Souza',
        email: 'maria@email.com',
        phone: '61999999999',
        message: 'Quero pintar o portão de casa.',
      });
    });

    it.each([
      ['nome', { name: undefined }],
      ['nome só com espaços', { name: '   ' }],
      ['telefone', { phone: '' }],
      ['mensagem', { message: undefined }],
      ['e-mail', { email: undefined }],
    ])(
      'Critério 2: recusa o formulário sem %s e diz qual campo falta: %j',
      async (_, overrides) => {
        const res = await sendContactForm(contactForm(overrides));
        const field = Object.keys(overrides)[0];

        expect(res.status).toBe(400);
        expect((res.body as { message: string[] }).message).toEqual(
          expect.arrayContaining([expect.stringContaining(field)]),
        );
      },
    );

    it.each([
      ['sem arroba', 'maria.email.com'],
      ['sem domínio', 'maria@'],
    ])(
      'Critério 3: recusa um e-mail %s (%s) com erro no campo email',
      async (_, email) => {
        const res = await sendContactForm(contactForm({ email }));

        expect(res.status).toBe(400);
        expect((res.body as { message: string[] }).message).toEqual([
          'email must be an email',
        ]);
      },
    );

    it('Critério 4: registra o contato como novo, um pedido de origem contact com cliente PF', async () => {
      const res = await sendContactForm(contactForm());
      const { orderId } = res.body as ContactRequestResponseDto;

      const [row] = await dataSource.query<Record<string, unknown>[]>(
        `SELECT o.source, o.status, o.customer_message, c.type, c.document
           FROM orders o JOIN customers c USING (customer_id)
          WHERE o.order_id = $1`,
        [orderId],
      );
      expect(row).toEqual({
        source: 'contact',
        status: 'requested',
        customer_message: 'Quero pintar o portão de casa.',
        type: 'individual',
        document: null,
      });
      expect(
        (await listContactRequests('requested')).map((c) => c.orderId),
      ).toContain(orderId);
    });

    it.each([
      ['handled', 'requested'],
      ['requested', 'handled'],
    ])(
      'Critério 4: a equipe marca como %s e o contato sai da lista de %s',
      async (newStatus, previousStatus) => {
        const res = await sendContactForm(contactForm());
        const { orderId } = res.body as ContactRequestResponseDto;
        if (previousStatus === 'handled') {
          await asEmployee()
            .patch(`/contact-requests/${orderId}/status`)
            .send({ status: 'handled' })
            .expect(200);
        }

        const updated = await asEmployee()
          .patch(`/contact-requests/${orderId}/status`)
          .send({ status: newStatus })
          .expect(200);

        expect((updated.body as ContactRequestResponseDto).status).toBe(
          newStatus,
        );
        expect(
          (await listContactRequests(newStatus)).map((c) => c.orderId),
        ).toContain(orderId);
        expect(
          (await listContactRequests(previousStatus)).map((c) => c.orderId),
        ).not.toContain(orderId);
      },
    );
  });

  describe('Área interna', () => {
    it.each([
      ['um status que não é de contato', 'sent'],
      ['um status inexistente', 'atendido'],
    ])('recusa marcar com %s (%s)', async (_, status) => {
      const res = await sendContactForm(contactForm());
      const { orderId } = res.body as ContactRequestResponseDto;

      await asEmployee()
        .patch(`/contact-requests/${orderId}/status`)
        .send({ status })
        .expect(400);
    });

    it('responde 409 quando o contato já virou orçamento', async () => {
      const res = await sendContactForm(contactForm());
      const { orderId } = res.body as ContactRequestResponseDto;
      await dataSource.query(
        `UPDATE orders SET status = 'sent' WHERE order_id = $1`,
        [orderId],
      );

      await asEmployee()
        .patch(`/contact-requests/${orderId}/status`)
        .send({ status: 'handled' })
        .expect(409);
    });

    it('responde 404 para um pedido que não existe', async () => {
      await asEmployee()
        .patch(`/contact-requests/${randomUUID()}/status`)
        .send({ status: 'handled' })
        .expect(404);
    });

    it.each([
      ['GET', '/contact-requests'],
      ['PATCH', `/contact-requests/${randomUUID()}/status`],
    ])('%s %s responde 401 sem login', async (method, url) => {
      const server = request(app.getHttpServer());
      const call = method === 'GET' ? server.get(url) : server.patch(url);

      await call.expect(401);
    });
  });
});
