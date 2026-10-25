import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, UNAUTHORIZED_MESSAGE } from '../auth.service';
import { AuthenticatedEmployeeDto } from '../dto/authenticated-employee.dto';

export interface AuthenticatedRequest extends Request {
  employee: AuthenticatedEmployeeDto;
}

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    request.employee = await this.authService.validateAccessToken(token);
    return true;
  }
}
