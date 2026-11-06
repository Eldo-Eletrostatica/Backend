import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerStorageService } from '@nestjs/throttler';
import { normalizeEmail } from '../../common/normalize-email';

export const MAX_LOGIN_ATTEMPTS_PER_ACCOUNT = 5;
export const MAX_LOGIN_ATTEMPTS_PER_IP = 20;
export const LOGIN_ATTEMPTS_WINDOW_MS = 60_000;
export const TOO_MANY_LOGIN_ATTEMPTS_MESSAGE =
  'Muitas tentativas de login. Tente novamente em 1 minuto.';

// On the site every login reaches the API through the Frontend proxy (ADR
// 0007), which appends the visitor's IP to X-Forwarded-For. The last entry is
// the one the proxy added; without the header, the request came directly.
// Trusting it assumes the API is reachable only through the proxy.
function findClientIp(request: Record<string, unknown>): string {
  const headers = request.headers as Record<string, unknown>;
  const forwardedFor = headers['x-forwarded-for'];
  const lastHop =
    typeof forwardedFor === 'string'
      ? forwardedFor.split(',').at(-1)?.trim()
      : undefined;
  return lastHop || String(request.ip);
}

function findLoginEmail(request: Record<string, unknown>): string {
  // Guards run before the validation pipe, so the body is still raw.
  const body = request.body as { email?: unknown } | undefined;
  return typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
}

// Two limits: per account and IP, against guessing one employee's password,
// and per IP alone, against trying a few passwords on many accounts. Counting
// per account and IP keeps an attacker from locking a real employee out.
// The rules live in the guard, not in ThrottlerModule.forRoot, which is global
// and would become the default of any other throttled route.
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  // Explicit tokens: otherwise Nest reuses the parent's constructor tokens,
  // which expect the options of ThrottlerModule.forRoot.
  constructor(
    @Inject(ThrottlerStorageService) storage: ThrottlerStorageService,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(
      {
        throttlers: [
          {
            name: 'loginAccount',
            ttl: LOGIN_ATTEMPTS_WINDOW_MS,
            limit: MAX_LOGIN_ATTEMPTS_PER_ACCOUNT,
            getTracker: (request) =>
              `${findClientIp(request)}:${findLoginEmail(request)}`,
          },
          {
            name: 'loginIp',
            ttl: LOGIN_ATTEMPTS_WINDOW_MS,
            limit: MAX_LOGIN_ATTEMPTS_PER_IP,
            getTracker: (request) => findClientIp(request),
          },
        ],
        errorMessage: TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
      },
      storage,
      reflector,
    );
  }
}
