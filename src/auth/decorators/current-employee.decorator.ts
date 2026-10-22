import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedEmployeeDto } from '../dto/authenticated-employee.dto';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

export const CurrentEmployee = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedEmployeeDto => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.employee;
  },
);
