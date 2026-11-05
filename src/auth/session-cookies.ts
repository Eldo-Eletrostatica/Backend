import { CookieOptions, Response } from 'express';
import { DEFAULT_TOKEN_EXPIRATION_SECONDS } from './jwt-token';

// The site keeps the session in cookies sent only to its own origin, through
// the Frontend proxy (ADR 0007).
export const SESSION_COOKIE = 'session';
// Readable by the Frontend, which echoes it in the CSRF header on writes.
export const CSRF_COOKIE = 'csrf_token';

const SESSION_COOKIE_MAX_AGE_MS = DEFAULT_TOKEN_EXPIRATION_SECONDS * 1000;

// The browser only drops a cookie whose attributes match the ones it was set
// with, so setting and clearing share these.
function cookieOptions(isHttpOnly: boolean, isSecure: boolean): CookieOptions {
  return {
    httpOnly: isHttpOnly,
    secure: isSecure,
    sameSite: 'strict',
    path: '/',
  };
}

export function setSessionCookies(
  response: Response,
  accessToken: string,
  csrfToken: string,
  isSecure: boolean,
): void {
  response.cookie(SESSION_COOKIE, accessToken, {
    ...cookieOptions(true, isSecure),
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
  response.cookie(CSRF_COOKIE, csrfToken, {
    ...cookieOptions(false, isSecure),
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function clearSessionCookies(
  response: Response,
  isSecure: boolean,
): void {
  response.clearCookie(SESSION_COOKIE, cookieOptions(true, isSecure));
  response.clearCookie(CSRF_COOKIE, cookieOptions(false, isSecure));
}
