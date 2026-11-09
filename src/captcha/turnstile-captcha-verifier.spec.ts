import { ConfigService } from '@nestjs/config';
import {
  TURNSTILE_VERIFY_URL,
  TurnstileCaptchaVerifier,
} from './turnstile-captcha-verifier';

const SECRET_KEY = 'segredo-de-teste';

function createVerifier(secretKey: string | undefined) {
  const config = {
    get: () => secretKey,
  } as unknown as ConfigService;
  return new TurnstileCaptchaVerifier(config);
}

describe('TurnstileCaptchaVerifier', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['aceita', true, true],
    ['recusa', false, false],
  ])(
    '%s o token conforme a resposta da Cloudflare (success: %s)',
    async (_scenario, success, expected) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success })));

      const isValid = await createVerifier(SECRET_KEY).verify(
        'token-do-site',
        '203.0.113.7',
      );

      expect(isValid).toBe(expected);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(TURNSTILE_VERIFY_URL);
      expect(init.method).toBe('POST');
      expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
        secret: SECRET_KEY,
        response: 'token-do-site',
        remoteip: '203.0.113.7',
      });
    },
  );

  it.each([
    ['sem a chave secreta', undefined, () => {}],
    [
      'com a Cloudflare fora do ar',
      SECRET_KEY,
      () => fetchMock.mockRejectedValue(new Error('fetch failed')),
    ],
  ])(
    'recusa o token %s, sem desligar a proteção (chave: %s)',
    async (_scenario, secretKey, arrange) => {
      arrange();

      const isValid = await createVerifier(secretKey).verify(
        'token-do-site',
        '203.0.113.7',
      );

      expect(isValid).toBe(false);
    },
  );
});
