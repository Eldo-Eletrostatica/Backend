import { randomInt } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CaptchaVerifier } from '../src/captcha/captcha-verifier';
import { INVALID_CAPTCHA_MESSAGE } from '../src/captcha/captcha.guard';
import { MAX_CONTACT_REQUESTS_PER_HOUR } from '../src/common/public-form-rate-limit';
import {
  FakeCaptchaVerifier,
  VALID_CAPTCHA_TOKEN,
} from './support/fake-captcha';

function randomClientIp(): string {
  const octet = () => randomInt(1, 255);
  return `10.${octet()}.${octet()}.${octet()}`;
}

describe('CAPTCHA dos formulários públicos (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CaptchaVerifier)
      .useClass(FakeCaptchaVerifier)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // The empty body fails validation (400), which only runs after the CAPTCHA,
  // so nothing is saved and every route can be checked the same way.
  it.each([
    ['/contact-requests', 'sem token', undefined, 403],
    ['/contact-requests', 'com token inválido', 'token-falso', 403],
    ['/contact-requests', 'com token válido', VALID_CAPTCHA_TOKEN, 400],
    ['/quotes/estimator', 'sem token', undefined, 403],
    ['/quotes/estimator', 'com token válido', VALID_CAPTCHA_TOKEN, 400],
    ['/quotes/pdf', 'sem token', undefined, 403],
    ['/quotes/pdf', 'com token válido', VALID_CAPTCHA_TOKEN, 400],
  ])(
    'POST %s %s (token: %s) responde %s',
    async (path, _scenario, token, expectedStatus) => {
      const req = request(app.getHttpServer())
        .post(path)
        .set('X-Forwarded-For', randomClientIp());
      if (token) req.set('X-Captcha-Token', token);

      const res = await req.send({}).expect(expectedStatus);

      if (expectedStatus === 403) {
        expect((res.body as { message: string }).message).toBe(
          INVALID_CAPTCHA_MESSAGE,
        );
      }
    },
  );

  // The per-IP limit runs first, so a script without a CAPTCHA is still
  // counted and blocked, and never gets to call Cloudflare in a loop.
  it.each([
    ['sem token', undefined],
    ['com token válido', VALID_CAPTCHA_TOKEN],
  ])(
    'o limite por IP vale antes do CAPTCHA: o envio seguinte %s (%s) responde 429',
    async (_scenario, token) => {
      const clientIp = randomClientIp();
      for (let i = 0; i < MAX_CONTACT_REQUESTS_PER_HOUR; i++) {
        await request(app.getHttpServer())
          .post('/contact-requests')
          .set('X-Forwarded-For', clientIp)
          .send({});
      }

      const req = request(app.getHttpServer())
        .post('/contact-requests')
        .set('X-Forwarded-For', clientIp);
      if (token) req.set('X-Captcha-Token', token);

      await req.send({}).expect(429);
    },
  );
});

describe('Token do Selenium no lugar do CAPTCHA (e2e)', () => {
  const END_TO_END_TOKEN = 'token-do-selenium-com-32-caracteres-ou-mais';
  // docker-compose.yml sets a development token; it comes back at the end.
  const originalToken = process.env.E2E_CAPTCHA_TOKEN;
  let app: INestApplication<App>;

  async function startApp(endToEndToken: string | undefined) {
    if (endToEndToken === undefined) delete process.env.E2E_CAPTCHA_TOKEN;
    else process.env.E2E_CAPTCHA_TOKEN = endToEndToken;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CaptchaVerifier)
      .useClass(FakeCaptchaVerifier)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  }

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.E2E_CAPTCHA_TOKEN;
    else process.env.E2E_CAPTCHA_TOKEN = originalToken;
  });

  function postContactRequest(token: string, clientIp = randomClientIp()) {
    return request(app.getHttpServer())
      .post('/contact-requests')
      .set('X-Forwarded-For', clientIp)
      .set('X-Captcha-Token', token)
      .send({});
  }

  // As above, the empty body answers 400 once the CAPTCHA passes.
  it('aceita o token configurado em E2E_CAPTCHA_TOKEN', async () => {
    await startApp(END_TO_END_TOKEN);
    await postContactRequest(END_TO_END_TOKEN).expect(400);
  });

  it('recusa um token diferente do configurado com 403', async () => {
    await startApp(END_TO_END_TOKEN);
    await postContactRequest(`${END_TO_END_TOKEN}-errado`).expect(403);
  });

  it('sem E2E_CAPTCHA_TOKEN, o mesmo token é recusado com 403', async () => {
    await startApp(undefined);
    await postContactRequest(END_TO_END_TOKEN).expect(403);
  });

  it('com E2E_CAPTCHA_TOKEN, o token do Turnstile continua valendo', async () => {
    await startApp(END_TO_END_TOKEN);
    await postContactRequest(VALID_CAPTCHA_TOKEN).expect(400);
  });

  // The suite sends forms on every run, so its token is not counted by the
  // per-IP limit; any other token still is.
  it('o token configurado não conta no limite por IP', async () => {
    await startApp(END_TO_END_TOKEN);
    const clientIp = randomClientIp();
    for (let i = 0; i <= MAX_CONTACT_REQUESTS_PER_HOUR; i++) {
      await postContactRequest(END_TO_END_TOKEN, clientIp).expect(400);
    }
  });

  it('um token errado continua contando no limite por IP', async () => {
    await startApp(END_TO_END_TOKEN);
    const clientIp = randomClientIp();
    for (let i = 0; i < MAX_CONTACT_REQUESTS_PER_HOUR; i++) {
      await postContactRequest(`${END_TO_END_TOKEN}-errado`, clientIp).expect(
        403,
      );
    }
    await postContactRequest(`${END_TO_END_TOKEN}-errado`, clientIp).expect(
      429,
    );
  });
});
