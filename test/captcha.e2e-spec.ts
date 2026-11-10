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
