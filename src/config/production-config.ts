type Environment = Record<string, unknown>;

// The value of .env.example: anyone who reads the repo can sign a session.
const DEVELOPMENT_JWT_SECRET = 'eldo-dev-jwt-secret';
// 32 characters of a random hex string hold 128 bits, the least for HS256.
const MIN_JWT_SECRET_LENGTH = 32;
// Cloudflare's test secrets always pass (1x), always fail (2x) or report the
// token as already used (3x), so none of them protects a real site.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TURNSTILE_TEST_SECRET_KEY = /^[123]x0{31}AA$/;

function readText(env: Environment, name: string): string {
  const value = env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function findProductionProblems(env: Environment): string[] {
  const problems: string[] = [];
  const jwtSecret = readText(env, 'JWT_SECRET');
  if (jwtSecret === DEVELOPMENT_JWT_SECRET) {
    problems.push('JWT_SECRET é o de desenvolvimento');
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET precisa ter pelo menos ${MIN_JWT_SECRET_LENGTH} caracteres`,
    );
  }
  if (!readText(env, 'SMTP_HOST')) {
    problems.push('SMTP_HOST não definido: os avisos por e-mail não sairiam');
  }
  if (!readText(env, 'NOTIFICATION_EMAIL')) {
    problems.push(
      'NOTIFICATION_EMAIL não definido: os avisos por e-mail não sairiam',
    );
  }
  if (TURNSTILE_TEST_SECRET_KEY.test(readText(env, 'TURNSTILE_SECRET_KEY'))) {
    problems.push('TURNSTILE_SECRET_KEY é uma chave de teste da Cloudflare');
  }
  return problems;
}

// Called by main.ts before the app starts: in production the API refuses to
// start with a configuration that would leave it open or silently broken,
// instead of running and failing later. Other environments pass untouched.
// Not the ConfigModule validate option: that one freezes the values read by
// ConfigService, and the e2e tests change process.env between apps.
export function validateProductionConfig<T extends Environment>(env: T): T {
  if (env.NODE_ENV !== 'production') return env;
  const problems = findProductionProblems(env);
  if (problems.length > 0) {
    throw new Error(
      `Configuração de produção inválida:\n- ${problems.join('\n- ')}`,
    );
  }
  return env;
}

// The Swagger page lists every route and DTO, a map of the API for an
// attacker, so production hides it unless ENABLE_SWAGGER=true.
export function isSwaggerEnabled(env: Environment): boolean {
  return env.NODE_ENV !== 'production' || env.ENABLE_SWAGGER === 'true';
}
