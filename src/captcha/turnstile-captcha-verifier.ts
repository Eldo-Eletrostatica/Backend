import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaptchaVerifier } from './captcha-verifier';

// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
export const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Fails closed: without the secret key, or when Cloudflare cannot be reached,
// no token passes, so a missing key in production blocks the forms instead
// of switching the protection off unnoticed.
@Injectable()
export class TurnstileCaptchaVerifier extends CaptchaVerifier {
  private readonly logger = new Logger(TurnstileCaptchaVerifier.name);
  private readonly secretKey: string | undefined;

  constructor(config: ConfigService) {
    super();
    this.secretKey = config.get<string>('TURNSTILE_SECRET_KEY') || undefined;
    if (!this.secretKey) {
      this.logger.error(
        'TURNSTILE_SECRET_KEY not set; the public forms will refuse every submission',
      );
    }
  }

  async verify(token: string, clientIp: string): Promise<boolean> {
    if (!this.secretKey) return false;
    try {
      const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body: new URLSearchParams({
          secret: this.secretKey,
          response: token,
          remoteip: clientIp,
        }),
      });
      const result = (await response.json()) as { success?: unknown };
      return result.success === true;
    } catch (error) {
      this.logger.error('Falha ao validar o CAPTCHA na Cloudflare', error);
      return false;
    }
  }
}
