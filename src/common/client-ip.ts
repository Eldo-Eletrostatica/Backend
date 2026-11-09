import { Request } from 'express';

// On the site every request reaches the API through the Frontend proxy (ADR
// 0007), which appends the visitor's IP to X-Forwarded-For. The last entry is
// the one the proxy added; without the header, the request came directly.
// Trusting it assumes the API is reachable only through the proxy.
export function findClientIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  const lastHop =
    typeof forwardedFor === 'string'
      ? forwardedFor.split(',').at(-1)?.trim()
      : undefined;
  return lastHop || String(request.ip);
}
