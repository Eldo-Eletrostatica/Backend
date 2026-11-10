import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { findClientIp } from './client-ip';
import { FixedWindowCounter } from './fixed-window-counter';

// A visitor sends a form once or twice; more than this from one IP in an hour
// is a script flooding the database (and, for contacts, the company's inbox).
export const MAX_CONTACT_REQUESTS_PER_HOUR = 5;
export const MAX_QUOTE_REQUESTS_PER_HOUR = 10;
// Calculating the price range saves nothing and sends no email, and a visitor
// may try many combinations of parts, so the limit is looser.
export const MAX_PRICE_RANGE_REQUESTS_PER_HOUR = 60;
export const TOO_MANY_FORM_SUBMISSIONS_MESSAGE =
  'Muitos envios em pouco tempo. Tente novamente mais tarde.';

const PUBLIC_FORM_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_FORM_LIMIT = 'publicFormLimit';

interface PublicFormLimit {
  form: string;
  maxPerHour: number;
}

// Runs before validation and file upload, so every submission counts, even
// an invalid one, and a blocked script does not even send its file.
@Injectable()
export class PublicFormRateLimitGuard implements CanActivate {
  private readonly submissions = new FixedWindowCounter(PUBLIC_FORM_WINDOW_MS);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.reflector.get<PublicFormLimit | undefined>(
      PUBLIC_FORM_LIMIT,
      context.getHandler(),
    );
    if (!limit) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${limit.form}:${findClientIp(request)}`;
    if (this.submissions.count(key) >= limit.maxPerHour) {
      throw new HttpException(
        TOO_MANY_FORM_SUBMISSIONS_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.submissions.increment(key);
    return true;
  }
}

// Routes that share a form name share the count, such as the quote by the
// estimator and by PDF.
export function LimitPublicForm(
  form: string,
  maxPerHour: number,
): MethodDecorator {
  return applyDecorators(
    SetMetadata(PUBLIC_FORM_LIMIT, { form, maxPerHour }),
    UseGuards(PublicFormRateLimitGuard),
  );
}
