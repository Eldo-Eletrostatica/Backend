import { createHash, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// The Selenium suite runs against production, where Cloudflare does not let
// an automated browser pass the challenge. With E2E_CAPTCHA_TOKEN set, the
// suite sends that secret in the CAPTCHA header; unset, nothing changes.
export const CAPTCHA_HEADER = 'x-captcha-token';

// Hashing both sides gives buffers of the same length, which timingSafeEqual
// requires, without revealing the length of the secret.
function isSameSecret(token: string, secret: string): boolean {
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(token), hash(secret));
}

export function readEndToEndToken(config: ConfigService): string | undefined {
  return config.get<string>('E2E_CAPTCHA_TOKEN') || undefined;
}

export function sendsEndToEndToken(
  request: Request,
  endToEndToken: string | undefined,
): boolean {
  const token = request.headers[CAPTCHA_HEADER];
  return (
    endToEndToken !== undefined &&
    typeof token === 'string' &&
    isSameSecret(token, endToEndToken)
  );
}
