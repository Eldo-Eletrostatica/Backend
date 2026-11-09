import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { findClientIp } from '../common/client-ip';
import { CaptchaVerifier } from './captcha-verifier';

export const INVALID_CAPTCHA_MESSAGE =
  'Confirme que você não é um robô e tente de novo.';
// A header, and not a body field, so the same check fits the JSON and the
// multipart (PDF) forms without touching their DTOs.
const CAPTCHA_HEADER = 'x-captcha-token';

// Runs before validation and file upload: a submission without a valid
// CAPTCHA is refused before any work.
@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private readonly captchaVerifier: CaptchaVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers[CAPTCHA_HEADER];
    const isValid =
      typeof token === 'string' &&
      token.length > 0 &&
      (await this.captchaVerifier.verify(token, findClientIp(request)));
    if (!isValid) {
      throw new ForbiddenException(INVALID_CAPTCHA_MESSAGE);
    }
    return true;
  }
}

// Put it above @LimitPublicForm: guards from stacked decorators run from the
// bottom up, and the per-IP limit must run first, so a script without a
// CAPTCHA is still counted and never calls Cloudflare in a loop.
export function RequireCaptcha(): MethodDecorator {
  return applyDecorators(UseGuards(CaptchaGuard));
}
