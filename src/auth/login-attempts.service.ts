import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { normalizeEmail } from '../common/normalize-email';

export const MAX_LOGIN_ATTEMPTS_PER_ACCOUNT = 5;
export const MAX_LOGIN_ATTEMPTS_PER_IP = 20;
export const LOGIN_ATTEMPTS_WINDOW_MS = 60_000;
export const TOO_MANY_LOGIN_ATTEMPTS_MESSAGE =
  'Muitas tentativas de login. Tente novamente em 1 minuto.';

interface FailureCount {
  failures: number;
  windowEndsAt: number;
}

// Limits failed logins, not logins: a correct password neither counts nor
// keeps counting the earlier mistakes. Two limits, per account and IP against
// guessing one employee's password, and per IP alone against trying a few
// passwords on many accounts. Keying the account limit by IP too keeps an
// attacker from locking a real employee out. Counts live in memory, so they
// reset when the API restarts.
@Injectable()
export class LoginAttemptsService {
  private readonly failureCounts = new Map<string, FailureCount>();
  private nextCleanupAt = 0;

  async track<T>(
    clientIp: string,
    email: string,
    login: () => Promise<T>,
  ): Promise<T> {
    const accountKey = `account:${clientIp}:${normalizeEmail(email)}`;
    const ipKey = `ip:${clientIp}`;
    const now = Date.now();

    if (
      this.countFailures(accountKey, now) >= MAX_LOGIN_ATTEMPTS_PER_ACCOUNT ||
      this.countFailures(ipKey, now) >= MAX_LOGIN_ATTEMPTS_PER_IP
    ) {
      throw new HttpException(
        TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const result = await login();
      this.failureCounts.delete(accountKey);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.recordFailure(accountKey, now);
        this.recordFailure(ipKey, now);
      }
      throw error;
    }
  }

  private countFailures(key: string, now: number): number {
    const count = this.failureCounts.get(key);
    return count && count.windowEndsAt > now ? count.failures : 0;
  }

  private recordFailure(key: string, now: number): void {
    this.removeExpiredCounts(now);
    const count = this.failureCounts.get(key);
    if (count && count.windowEndsAt > now) {
      count.failures += 1;
    } else {
      this.failureCounts.set(key, {
        failures: 1,
        windowEndsAt: now + LOGIN_ATTEMPTS_WINDOW_MS,
      });
    }
  }

  // Keeps the map from growing with every email an attacker tries.
  private removeExpiredCounts(now: number): void {
    if (now < this.nextCleanupAt) {
      return;
    }
    for (const [key, count] of this.failureCounts) {
      if (count.windowEndsAt <= now) {
        this.failureCounts.delete(key);
      }
    }
    this.nextCleanupAt = now + LOGIN_ATTEMPTS_WINDOW_MS;
  }
}
