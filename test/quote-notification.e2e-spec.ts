import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { QuoteResponseDto } from '../src/quotes/dto/quote-response.dto';
import { CaptchaVerifier } from '../src/captcha/captcha-verifier';
import {
  FakeCaptchaVerifier,
  VALID_CAPTCHA_TOKEN,
} from './support/fake-captcha';

const MAILPIT_API_URL = process.env.MAILPIT_API_URL ?? 'http://localhost:8025';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL ?? '';
const EMAIL_WAIT_MS = 5000;
const POLL_INTERVAL_MS = 200;
const DUE_DATE = '2030-01-15';
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << >> endobj\n%%EOF');

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  ReplyTo: { Address: string }[];
}

interface MailpitAttachment {
  FileName: string;
  ContentType: string;
  Size: number;
}

function randomLetters(length: number): string {
  return Array.from({ length }, () =>
    String.fromCharCode(97 + randomInt(26)),
  ).join('');
}

function randomClientIp(): string {
  const octet = () => randomInt(1, 255);
  return `10.${octet()}.${octet()}.${octet()}`;
}

function randomCnpj(): string {
  return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
}

async function waitForEmail(subjectText: string): Promise<MailpitMessage> {
  const query = encodeURIComponent(`subject:"${subjectText}"`);
  const deadline = Date.now() + EMAIL_WAIT_MS;
  for (;;) {
    const res = await fetch(`${MAILPIT_API_URL}/api/v1/search?query=${query}`);
    const [email] = ((await res.json()) as { messages: MailpitMessage[] })
      .messages;
    if (email || Date.now() > deadline) return email;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function readEmail(
  id: string,
): Promise<{ Text: string; Attachments: MailpitAttachment[] }> {
  const res = await fetch(`${MAILPIT_API_URL}/api/v1/message/${id}`);
  return (await res.json()) as {
    Text: string;
    Attachments: MailpitAttachment[];
  };
}

describe('Aviso por e-mail de orçamento novo (e2e) - US07 e US28', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let paintId: string;
  let materialId: string;
  let paintName: string;
  let materialName: string;
  let developmentSettings: {
    is_estimator_enabled: boolean;
    negotiation_margin: string;
  };
  const createdCustomerIds: string[] = [];
  const createdCatalogItemIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CaptchaVerifier)
      .useClass(FakeCaptchaVerifier)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    [developmentSettings] = await dataSource.query(
      'SELECT is_estimator_enabled, negotiation_margin FROM site_settings',
    );
    await dataSource.query(
      'UPDATE site_settings SET is_estimator_enabled = true, negotiation_margin = 15',
    );
    paintName = `Epóxi ${randomLetters(6)}`;
    materialName = `Aço ${randomLetters(6)}`;
    [{ catalog_item_id: paintId }] = await dataSource.query(
      `INSERT INTO catalog_items (type, name, price_per_m2) VALUES ('paintType', $1, 50) RETURNING catalog_item_id`,
      [paintName],
    );
    [{ catalog_item_id: materialId }] = await dataSource.query(
      `INSERT INTO catalog_items (type, name, price_factor) VALUES ('partMaterial', $1, 1) RETURNING catalog_item_id`,
      [materialName],
    );
    createdCatalogItemIds.push(paintId, materialId);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM orders WHERE customer_id = ANY($1)', [
      createdCustomerIds,
    ]);
    await dataSource.query(
      'DELETE FROM customers WHERE customer_id = ANY($1)',
      [createdCustomerIds],
    );
    await dataSource.query(
      'DELETE FROM catalog_items WHERE catalog_item_id = ANY($1)',
      [createdCatalogItemIds],
    );
    await dataSource.query(
      'UPDATE site_settings SET is_estimator_enabled = $1, negotiation_margin = $2',
      [
        developmentSettings.is_estimator_enabled,
        developmentSettings.negotiation_margin,
      ],
    );
    await app.close();
  });

  it('avisa a empresa de um orçamento pelo simulador, com as peças e a faixa de preço', async () => {
    const companyName = `Metalurgica ${randomLetters(8)} Ltda`;
    const cnpj = randomCnpj();

    const res = await request(app.getHttpServer())
      .post('/quotes/estimator')
      .set('X-Forwarded-For', randomClientIp())
      .set('X-Captcha-Token', VALID_CAPTCHA_TOKEN)
      .send({
        customer: {
          name: companyName,
          cnpj,
          email: 'compras@empresa.com.br',
          phone: '61999998888',
        },
        items: [
          {
            paintCatalogItemId: paintId,
            materialCatalogItemId: materialId,
            areaM2: 2,
            quantity: 3,
          },
        ],
        dueDate: DUE_DATE,
        message: 'Cor RAL 9005',
      })
      .expect(201);
    createdCustomerIds.push((res.body as QuoteResponseDto).customerId);

    const email = await waitForEmail(companyName);
    expect(email).toBeDefined();
    expect(email.Subject).toBe(`Novo orçamento pelo simulador: ${companyName}`);
    expect(email.To.map((to) => to.Address)).toEqual([NOTIFICATION_EMAIL]);
    expect(email.ReplyTo.map((replyTo) => replyTo.Address)).toEqual([
      'compras@empresa.com.br',
    ]);
    const { Text } = await readEmail(email.ID);
    for (const expected of [
      companyName,
      `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`,
      '(61) 99999-8888',
      `3 peças de 2 m², ${paintName} em ${materialName}`,
      'R$ 300,00 a R$ 345,00',
      '15/01/2030',
      'Cor RAL 9005',
    ]) {
      expect(Text).toContain(expected);
    }
  });

  it('avisa a empresa de um orçamento por PDF, com o arquivo anexado', async () => {
    const companyName = `Metalurgica ${randomLetters(8)} Ltda`;
    const cnpj = randomCnpj();

    const res = await request(app.getHttpServer())
      .post('/quotes/pdf')
      .set('X-Forwarded-For', randomClientIp())
      .set('X-Captcha-Token', VALID_CAPTCHA_TOKEN)
      .field('name', companyName)
      .field('cnpj', cnpj)
      .field('email', 'compras@empresa.com.br')
      .field('phone', '61999998888')
      .attach('file', PDF, {
        filename: `projeto-${randomUUID()}.pdf`,
        contentType: 'application/pdf',
      })
      .expect(201);
    createdCustomerIds.push((res.body as QuoteResponseDto).customerId);

    const email = await waitForEmail(companyName);
    expect(email).toBeDefined();
    expect(email.Subject).toBe(`Novo orçamento por PDF: ${companyName}`);
    expect(email.To.map((to) => to.Address)).toEqual([NOTIFICATION_EMAIL]);
    const { Text, Attachments } = await readEmail(email.ID);
    expect(Text).toContain(companyName);
    expect(Attachments).toEqual([
      expect.objectContaining({
        FileName: `projeto-${cnpj}.pdf`,
        ContentType: 'application/pdf',
        Size: PDF.length,
      }),
    ]);
  });
});
