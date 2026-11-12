import {
  isSwaggerEnabled,
  validateProductionConfig,
} from './production-config';

const PRODUCTION_CONFIG = {
  NODE_ENV: 'production',
  JWT_SECRET:
    'c2f1b7e94a6d0853fe17a9c4b2d68e0175f3a9c1d4e6b8027a5c3f9e1b7d4a60',
  SMTP_HOST: 'smtp.gmail.com',
  NOTIFICATION_EMAIL: 'contato@eldo.com.br',
  TURNSTILE_SECRET_KEY: '0x4AAAAAAA-chave-secreta-de-producao',
};

describe('validateProductionConfig', () => {
  it.each([
    ['produção bem configurada', PRODUCTION_CONFIG],
    [
      'produção com o token do Selenium',
      {
        ...PRODUCTION_CONFIG,
        E2E_CAPTCHA_TOKEN: '9f4c2a7e1b8d3f6a0c5e2b9d7f1a4c8e',
      },
    ],
    [
      'desenvolvimento com os valores do .env.example',
      {
        NODE_ENV: 'development',
        JWT_SECRET: 'eldo-dev-jwt-secret',
        TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      },
    ],
  ])('aceita %s', (_scenario, config) => {
    expect(validateProductionConfig(config)).toBe(config);
  });

  it.each([
    [
      'o JWT_SECRET de desenvolvimento',
      { JWT_SECRET: 'eldo-dev-jwt-secret' },
      'JWT_SECRET',
    ],
    ['um JWT_SECRET curto', { JWT_SECRET: 'segredo-curto' }, 'JWT_SECRET'],
    ['sem SMTP_HOST', { SMTP_HOST: undefined }, 'SMTP_HOST'],
    [
      'sem NOTIFICATION_EMAIL',
      { NOTIFICATION_EMAIL: '' },
      'NOTIFICATION_EMAIL',
    ],
    [
      'a chave de teste do Turnstile que aprova tudo',
      { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' },
      'TURNSTILE_SECRET_KEY',
    ],
    [
      'a chave de teste do Turnstile que recusa tudo',
      { TURNSTILE_SECRET_KEY: '2x0000000000000000000000000000000AA' },
      'TURNSTILE_SECRET_KEY',
    ],
    [
      'o E2E_CAPTCHA_TOKEN de desenvolvimento',
      { E2E_CAPTCHA_TOKEN: 'eldo-dev-e2e-captcha-token-local' },
      'E2E_CAPTCHA_TOKEN',
    ],
    [
      'um E2E_CAPTCHA_TOKEN curto',
      { E2E_CAPTCHA_TOKEN: 'token-curto' },
      'E2E_CAPTCHA_TOKEN',
    ],
  ])('recusa subir em produção com %s', (_scenario, overrides, variable) => {
    expect(() =>
      validateProductionConfig({ ...PRODUCTION_CONFIG, ...overrides }),
    ).toThrow(variable);
  });

  it('lista todos os problemas de uma vez', () => {
    expect(() =>
      validateProductionConfig({
        ...PRODUCTION_CONFIG,
        JWT_SECRET: 'eldo-dev-jwt-secret',
        SMTP_HOST: '',
      }),
    ).toThrow(/JWT_SECRET[\s\S]*SMTP_HOST/);
  });
});

describe('isSwaggerEnabled', () => {
  it.each([
    ['development', undefined, true],
    ['test', undefined, true],
    ['production', undefined, false],
    ['production', 'true', true],
    ['production', 'false', false],
  ])(
    'com NODE_ENV=%s e ENABLE_SWAGGER=%s, devolve %s',
    (nodeEnv, enableSwagger, expected) => {
      expect(
        isSwaggerEnabled({ NODE_ENV: nodeEnv, ENABLE_SWAGGER: enableSwagger }),
      ).toBe(expected);
    },
  );
});
