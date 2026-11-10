import { randomInt } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MAX_COMPANY_NOTIFICATIONS_PER_HOUR } from '../src/mail/company-notifier';
import { ContactRequestResponseDto } from '../src/contact-requests/dto/contact-request-response.dto';
import {
  MAX_CONTACT_REQUESTS_PER_HOUR,
  MAX_QUOTE_REQUESTS_PER_HOUR,
  TOO_MANY_FORM_SUBMISSIONS_MESSAGE,
} from '../src/common/public-form-rate-limit';
import { CaptchaVerifier } from '../src/captcha/captcha-verifier';
import {
  FakeCaptchaVerifier,
  VALID_CAPTCHA_TOKEN,
} from './support/fake-captcha';

const MAILPIT_API_URL = process.env.MAILPIT_API_URL ?? 'http://localhost:8025';
const EMAIL_WAIT_MS = 5000;
const POLL_INTERVAL_MS = 200;

// Names accept letters only, so the unique part is letters.
function randomLetters(length: number): string {
  return Array.from({ length }, () =>
    String.fromCharCode(97 + randomInt(26)),
  ).join('');
}

function randomClientIp(): string {
  const octet = () => randomInt(1, 255);
  return `10.${octet()}.${octet()}.${octet()}`;
}

async function countEmails(subjectText: string): Promise<number> {
  const query = encodeURIComponent(`subject:"${subjectText}"`);
  const res = await fetch(`${MAILPIT_API_URL}/api/v1/search?query=${query}`);
  return ((await res.json()) as { messages_count: number }).messages_count;
}

describe('Proteção dos formulários públicos contra spam (e2e) - US06, US07 e US28', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const createdOrderIds: string[] = [];

  beforeEach(async () => {
    // A new app per test starts the in-memory counters from zero.
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CaptchaVerifier)
      .useClass(FakeCaptchaVerifier)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
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
    createdOrderIds.length = 0;
    await app.close();
  });

  async function sendContactForm(
    clientIp: string,
    overrides: Record<string, unknown> = {},
  ) {
    const res = await request(app.getHttpServer())
      .post('/contact-requests')
      .set('X-Forwarded-For', clientIp)
      .set('X-Captcha-Token', VALID_CAPTCHA_TOKEN)
      .send({
        name: `Visitante ${randomLetters(8)}`,
        email: 'visitante@email.com',
        phone: '61999998888',
        message: 'Quero pintar o portão de casa.',
        ...overrides,
      });
    if (res.status === 201) {
      createdOrderIds.push((res.body as ContactRequestResponseDto).orderId);
    }
    return res;
  }

  it('honeypot: responde como sucesso a um robô que preenche o campo escondido, mas não grava nem avisa', async () => {
    const name = `Robo ${randomLetters(8)}`;

    const res = await sendContactForm(randomClientIp(), {
      name,
      website: 'https://spam.example',
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(res.status).toBe(201);
    const [{ count }] = await dataSource.query<{ count: string }[]>(
      'SELECT count(*) FROM customers WHERE name = $1',
      [name],
    );
    expect(Number(count)).toBe(0);
    expect(await countEmails(name)).toBe(0);
  });

  it.each([
    ['do mesmo IP', true, 429],
    ['de outro IP', false, 201],
  ])(
    `limita o contato a ${MAX_CONTACT_REQUESTS_PER_HOUR} envios por hora por IP: o envio seguinte %s (%s) responde %s`,
    async (_scenario, isSameIp, expectedStatus) => {
      const clientIp = randomClientIp();
      for (let i = 0; i < MAX_CONTACT_REQUESTS_PER_HOUR; i++) {
        expect((await sendContactForm(clientIp)).status).toBe(201);
      }

      const res = await sendContactForm(isSameIp ? clientIp : randomClientIp());

      expect(res.status).toBe(expectedStatus);
      if (expectedStatus === 429) {
        expect((res.body as { message: string }).message).toBe(
          TOO_MANY_FORM_SUBMISSIONS_MESSAGE,
        );
      }
    },
  );

  // The empty body fails validation (400), which only runs after the limit, so
  // no quote is created.
  it.each([
    ['/quotes/estimator', 'do simulador'],
    ['/quotes/pdf', 'do PDF'],
  ])(
    `limita o orçamento a ${MAX_QUOTE_REQUESTS_PER_HOUR} envios por hora por IP, somando simulador e PDF: o seguinte por %s (%s) responde 429`,
    async (path) => {
      const clientIp = randomClientIp();
      for (let i = 0; i < MAX_QUOTE_REQUESTS_PER_HOUR; i++) {
        const quotePath = i % 2 === 0 ? '/quotes/estimator' : '/quotes/pdf';
        await request(app.getHttpServer())
          .post(quotePath)
          .set('X-Forwarded-For', clientIp)
          .set('X-Captcha-Token', VALID_CAPTCHA_TOKEN)
          .send({})
          .expect(400);
      }

      const res = await request(app.getHttpServer())
        .post(path)
        .set('X-Forwarded-For', clientIp)
        .set('X-Captcha-Token', VALID_CAPTCHA_TOKEN)
        .send({});

      expect(res.status).toBe(429);
    },
  );

  it(`avisa a Eldo de no máximo ${MAX_COMPANY_NOTIFICATIONS_PER_HOUR} contatos por hora, mas grava todos`, async () => {
    const batch = randomLetters(8);
    const total = MAX_COMPANY_NOTIFICATIONS_PER_HOUR + 2;
    for (let i = 0; i < total; i++) {
      const res = await sendContactForm(randomClientIp(), {
        name: `Lote ${batch} ${randomLetters(4)}`,
      });
      expect(res.status).toBe(201);
    }

    const deadline = Date.now() + EMAIL_WAIT_MS;
    let emails = await countEmails(batch);
    while (
      emails < MAX_COMPANY_NOTIFICATIONS_PER_HOUR &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      emails = await countEmails(batch);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(await countEmails(batch)).toBe(MAX_COMPANY_NOTIFICATIONS_PER_HOUR);
    const [{ count }] = await dataSource.query<{ count: string }[]>(
      'SELECT count(*) FROM customers WHERE name LIKE $1',
      [`Lote ${batch} %`],
    );
    expect(Number(count)).toBe(total);
  });
});
