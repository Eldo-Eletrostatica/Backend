import { randomInt } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ContactRequestResponseDto } from '../src/contact-requests/dto/contact-request-response.dto';

const MAILPIT_API_URL = process.env.MAILPIT_API_URL ?? 'http://localhost:8025';
const NOTIFICATION_EMAIL = process.env.CONTACT_NOTIFICATION_EMAIL ?? '';
// The email is sent after the response, so the test waits for it to arrive.
const EMAIL_WAIT_MS = 5000;
const NO_EMAIL_WAIT_MS = 2000;
const POLL_INTERVAL_MS = 200;

interface MailpitAddress {
  Address: string;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: MailpitAddress[];
  ReplyTo: MailpitAddress[];
}

// Names accept letters only, so the unique part of each visitor is letters.
function uniqueVisitorName(): string {
  const letters = Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + randomInt(26)),
  ).join('');
  return `Visitante ${letters}`;
}

async function findEmails(visitorName: string): Promise<MailpitMessage[]> {
  const query = encodeURIComponent(`subject:"${visitorName}"`);
  const res = await fetch(`${MAILPIT_API_URL}/api/v1/search?query=${query}`);
  const body = (await res.json()) as { messages: MailpitMessage[] };
  return body.messages;
}

async function waitForEmails(
  visitorName: string,
  timeoutMs: number,
): Promise<MailpitMessage[]> {
  const deadline = Date.now() + timeoutMs;
  let emails = await findEmails(visitorName);
  while (emails.length === 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    emails = await findEmails(visitorName);
  }
  return emails;
}

async function readEmailText(id: string): Promise<string> {
  const res = await fetch(`${MAILPIT_API_URL}/api/v1/message/${id}`);
  return ((await res.json()) as { Text: string }).Text;
}

describe('Aviso por e-mail de contato novo (e2e) - US28', () => {
  const createdOrderIds: string[] = [];

  async function startApp(env: Record<string, string> = {}) {
    const previous = Object.fromEntries(
      Object.keys(env).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, env);
    try {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      const app = moduleFixture.createNestApplication<INestApplication<App>>();
      await app.init();
      return app;
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }

  async function sendContactForm(
    app: INestApplication<App>,
    visitorName: string,
  ) {
    const res = await request(app.getHttpServer())
      .post('/contact-requests')
      .send({
        name: visitorName,
        email: 'visitante@email.com',
        phone: '61999998888',
        message: 'Quero pintar o portão de casa.',
      })
      .expect(201);
    createdOrderIds.push((res.body as ContactRequestResponseDto).orderId);
    return res;
  }

  afterAll(async () => {
    const app = await startApp();
    const dataSource = app.get(DataSource);
    const customers = await dataSource.query<{ customer_id: string }[]>(
      'SELECT customer_id FROM orders WHERE order_id = ANY($1)',
      [createdOrderIds],
    );
    await dataSource.query('DELETE FROM orders WHERE order_id = ANY($1)', [
      createdOrderIds,
    ]);
    await dataSource.query(
      'DELETE FROM customers WHERE customer_id = ANY($1)',
      [customers.map((customer) => customer.customer_id)],
    );
    await app.close();
  });

  it('Critério 1: avisa a empresa com os dados do visitante e a resposta indo para o e-mail dele', async () => {
    const app = await startApp();
    const visitorName = uniqueVisitorName();

    await sendContactForm(app, visitorName);
    const [email] = await waitForEmails(visitorName, EMAIL_WAIT_MS);
    await app.close();

    expect(email).toBeDefined();
    expect(email.To.map((to) => to.Address)).toEqual([NOTIFICATION_EMAIL]);
    expect(email.ReplyTo.map((replyTo) => replyTo.Address)).toEqual([
      'visitante@email.com',
    ]);
    const text = await readEmailText(email.ID);
    expect(text).toContain(visitorName);
    expect(text).toContain('(61) 99999-8888');
    expect(text).toContain('visitante@email.com');
    expect(text).toContain('Quero pintar o portão de casa.');
  });

  it.each([
    ['sem endereço de aviso configurado', { CONTACT_NOTIFICATION_EMAIL: '' }],
    ['com o servidor de e-mail fora do ar', { SMTP_PORT: '1' }],
  ])(
    'Critérios 2 e 3: %s, registra o contato e não envia e-mail: %j',
    async (_, env) => {
      const app = await startApp(env);
      const visitorName = uniqueVisitorName();

      const res = await sendContactForm(app, visitorName);
      const emails = await waitForEmails(visitorName, NO_EMAIL_WAIT_MS);
      await app.close();

      expect((res.body as ContactRequestResponseDto).name).toBe(visitorName);
      expect(emails).toEqual([]);
    },
  );
});
