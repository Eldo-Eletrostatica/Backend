import { CaptchaVerifier } from '../../src/captcha/captcha-verifier';

// Stands in for Cloudflare in the integration tests, so they run without the
// network: only this token passes.
export const VALID_CAPTCHA_TOKEN = 'captcha-de-teste-valido';

export class FakeCaptchaVerifier extends CaptchaVerifier {
  verify(token: string): Promise<boolean> {
    return Promise.resolve(token === VALID_CAPTCHA_TOKEN);
  }
}
