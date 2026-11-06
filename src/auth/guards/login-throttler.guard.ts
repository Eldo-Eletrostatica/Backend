import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const MAX_LOGIN_ATTEMPTS_PER_MINUTE = 5;
export const LOGIN_ATTEMPTS_WINDOW_MS = 60_000;
export const TOO_MANY_LOGIN_ATTEMPTS_MESSAGE =
  'Muitas tentativas de login. Tente novamente em 1 minuto.';

// Counts attempts per account and IP rather than per IP alone: on the site
// every login reaches the API through the Frontend proxy with the same IP, so
// an IP-only limit would lock all employees out at once.
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, unknown>): Promise<string> {
    const body = request.body as { email?: unknown } | undefined;
    // Guards run before the validation pipe, so the email is normalized here
    // the same way LoginDto does.
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return Promise.resolve(`${String(request.ip)}:${email}`);
  }
}
