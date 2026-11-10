import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FixedWindowCounter } from '../common/fixed-window-counter';
import { normalizeEmail } from '../common/normalize-email';

export const MAX_LOGIN_ATTEMPTS_PER_ACCOUNT = 5;
export const MAX_LOGIN_ATTEMPTS_PER_IP = 20;
export const LOGIN_ATTEMPTS_WINDOW_MS = 60_000;
export const TOO_MANY_LOGIN_ATTEMPTS_MESSAGE =
  'Muitas tentativas de login. Tente novamente em 1 minuto.';

// Limits failed logins, not logins: a correct password neither counts nor
// keeps counting the earlier mistakes. Two limits, per account and IP against
// guessing one employee's password, and per IP alone against trying a few
// passwords on many accounts. Keying the account limit by IP too keeps an
// attacker from locking a real employee out. Counts live in memory, so they
// reset when the API restarts.
@Injectable()
export class LoginAttemptsService {
  private readonly failures = new FixedWindowCounter(LOGIN_ATTEMPTS_WINDOW_MS);

  async track<T>(
    clientIp: string,
    email: string,
    login: () => Promise<T>,
  ): Promise<T> {
    const accountKey = `account:${clientIp}:${normalizeEmail(email)}`;
    const ipKey = `ip:${clientIp}`;
    const now = Date.now();

    if (
      this.failures.count(accountKey, now) >= MAX_LOGIN_ATTEMPTS_PER_ACCOUNT ||
      this.failures.count(ipKey, now) >= MAX_LOGIN_ATTEMPTS_PER_IP
    ) {
      throw new HttpException(
        TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const result = await login();
      this.failures.reset(accountKey);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.failures.increment(accountKey, now);
        this.failures.increment(ipKey, now);
      }
      throw error;
    }
  }
}
