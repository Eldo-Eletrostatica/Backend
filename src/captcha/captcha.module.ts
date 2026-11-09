import { Module } from '@nestjs/common';
import { CaptchaVerifier } from './captcha-verifier';
import { CaptchaGuard } from './captcha.guard';
import { TurnstileCaptchaVerifier } from './turnstile-captcha-verifier';

@Module({
  providers: [
    { provide: CaptchaVerifier, useClass: TurnstileCaptchaVerifier },
    CaptchaGuard,
  ],
  exports: [CaptchaVerifier, CaptchaGuard],
})
export class CaptchaModule {}
