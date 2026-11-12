import { createHash, timingSafeEqual } from 'node:crypto';
import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { findClientIp } from '../common/client-ip';
import { CaptchaVerifier } from './captcha-verifier';

export const INVALID_CAPTCHA_MESSAGE =
  'Confirme que você não é um robô e tente de novo.';
// A header, and not a body field, so the same check fits the JSON and the
// multipart (PDF) forms without touching their DTOs.
const CAPTCHA_HEADER = 'x-captcha-token';

// Hashing both sides gives buffers of the same length, which timingSafeEqual
// requires, without revealing the length of the secret.
function isSameSecret(token: string, secret: string): boolean {
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(token), hash(secret));
}

// Runs before validation and file upload: a submission without a valid
// CAPTCHA is refused before any work.
@Injectable()
export class CaptchaGuard implements CanActivate {
  // The Selenium suite runs against production, where Cloudflare does not let
  // an automated browser pass the challenge. With this secret set, the suite
  // sends it in place of the Turnstile token. Unset, nothing changes.
  private readonly endToEndToken: string | undefined;

  constructor(
    private readonly captchaVerifier: CaptchaVerifier,
    config: ConfigService,
  ) {
    this.endToEndToken = config.get<string>('E2E_CAPTCHA_TOKEN') || undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers[CAPTCHA_HEADER];
    const isValid =
      typeof token === 'string' &&
      token.length > 0 &&
      (this.isEndToEndToken(token) ||
        (await this.captchaVerifier.verify(token, findClientIp(request))));
    if (!isValid) {
      throw new ForbiddenException(INVALID_CAPTCHA_MESSAGE);
    }
    return true;
  }

  private isEndToEndToken(token: string): boolean {
    return (
      this.endToEndToken !== undefined &&
      isSameSecret(token, this.endToEndToken)
    );
  }
}

// Put it above @LimitPublicForm: guards from stacked decorators run from the
// bottom up, and the per-IP limit must run first, so a script without a
// CAPTCHA is still counted and never calls Cloudflare in a loop.
export function RequireCaptcha(): MethodDecorator {
  return applyDecorators(UseGuards(CaptchaGuard));
}
