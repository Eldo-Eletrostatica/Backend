import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, UNAUTHORIZED_MESSAGE } from '../auth.service';
import { AuthenticatedEmployeeDto } from '../dto/authenticated-employee.dto';
import { SESSION_COOKIE } from '../session-cookies';

export interface AuthenticatedRequest extends Request {
  employee: AuthenticatedEmployeeDto;
}

const BEARER_PREFIX = 'Bearer ';
const CSRF_HEADER = 'x-csrf-token';
// The browser sends the session cookie on its own, so only writes made with it
// can be forged by another site (ADR 0007). A Bearer token is set by code.
const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const CSRF_TOKEN_MISMATCH_MESSAGE = 'Token CSRF ausente ou inválido.';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bearerToken = this.findBearerToken(request);
    const token = bearerToken ?? this.findSessionCookie(request);

    if (!token) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    const session = await this.authService.validateAccessToken(token);
    if (
      bearerToken === undefined &&
      CSRF_PROTECTED_METHODS.has(request.method)
    ) {
      this.assertCsrfToken(request, session.csrfToken);
    }

    request.employee = session.employee;
    return true;
  }

  private findBearerToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      return undefined;
    }
    return authHeader.slice(BEARER_PREFIX.length).trim() || undefined;
  }

  private findSessionCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[SESSION_COOKIE] || undefined;
  }

  // Compares with the claim inside the signed JWT, not with the CSRF cookie, so
  // a cookie planted by another subdomain cannot forge a matching pair.
  private assertCsrfToken(request: Request, expectedToken: string): void {
    const providedToken = request.headers[CSRF_HEADER];
    const provided = Buffer.from(
      typeof providedToken === 'string' ? providedToken : '',
    );
    const expected = Buffer.from(expectedToken);

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new ForbiddenException(CSRF_TOKEN_MISMATCH_MESSAGE);
    }
  }
}
