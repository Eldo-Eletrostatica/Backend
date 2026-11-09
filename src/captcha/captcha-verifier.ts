// Checks a CAPTCHA token. An abstract class so the integration tests can swap
// Cloudflare for a fake without the network.
export abstract class CaptchaVerifier {
  abstract verify(token: string, clientIp: string): Promise<boolean>;
}
