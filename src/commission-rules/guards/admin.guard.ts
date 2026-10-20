import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import {
  Employee,
  EmployeeRole,
} from '../../employees/entities/employee.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly dataSource?: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const roleHeader = request.headers['x-user-role'];
    const employeeIdHeader = request.headers['x-employee-id'];

    if (roleHeader === EmployeeRole.Admin) {
      return true;
    }

    if (typeof employeeIdHeader === 'string' && this.dataSource) {
      const employee = await this.dataSource.getRepository(Employee).findOne({
        where: { employeeId: employeeIdHeader },
      });

      if (employee && employee.role === EmployeeRole.Admin) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Acesso permitido apenas para administradores.',
    );
  }
}
