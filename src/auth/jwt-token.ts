import { createHmac, timingSafeEqual } from 'node:crypto';
import { EmployeeRole } from '../employees/entities/employee.entity';

export const DEFAULT_TOKEN_EXPIRATION_SECONDS = 8 * 60 * 60;

export interface JwtClaims {
  sub: string;
  email: string;
  role: EmployeeRole;
}

export interface JwtPayload extends JwtClaims {
  iat: number;
  exp: number;
}

const JWT_HEADER = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
).toString('base64url');

function computeSignature(unsignedToken: string, secret: string): string {
  return createHmac('sha256', secret).update(unsignedToken).digest('base64url');
}

export function signJwt(
  claims: JwtClaims,
  secret: string,
  expiresInSeconds = DEFAULT_TOKEN_EXPIRATION_SECONDS,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const payload: JwtPayload = {
    ...claims,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const unsignedToken = `${JWT_HEADER}.${encodedPayload}`;
  const signature = computeSignature(unsignedToken, secret);
  return `${unsignedToken}.${signature}`;
}

export function verifyJwt(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = computeSignature(
    `${headerPart}.${payloadPart}`,
    secret,
  );
  const providedBuffer = Buffer.from(signaturePart);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decodedHeader = JSON.parse(
      Buffer.from(headerPart, 'base64url').toString('utf8'),
    ) as { alg?: unknown; typ?: unknown };
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') {
      return null;
    }

    const decodedPayload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    ) as Partial<JwtPayload>;

    if (
      typeof decodedPayload.sub !== 'string' ||
      typeof decodedPayload.email !== 'string' ||
      !Object.values(EmployeeRole).includes(
        decodedPayload.role as EmployeeRole,
      ) ||
      typeof decodedPayload.iat !== 'number' ||
      typeof decodedPayload.exp !== 'number'
    ) {
      return null;
    }

    if (decodedPayload.exp <= nowSeconds) {
      return null;
    }

    return decodedPayload as JwtPayload;
  } catch {
    return null;
  }
}
