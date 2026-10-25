import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeeRole } from '../../employees/entities/employee.entity';
import { FORBIDDEN_ROLE_MESSAGE, RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createContext(role?: EmployeeRole): ExecutionContext {
    const request = role
      ? {
          employee: {
            employeeId: '11111111-1111-4111-8111-111111111111',
            name: 'Teste',
            email: 'teste@eldo.com.br',
            role,
          },
        }
      : {};

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('permite o acesso quando a rota não exige níveis de acesso específicos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext(EmployeeRole.Employee))).toBe(true);
  });

  it('permite o acesso quando o funcionário possui o nível de acesso exigido', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([EmployeeRole.Admin]);

    expect(guard.canActivate(createContext(EmployeeRole.Admin))).toBe(true);
  });

  it.each([
    [EmployeeRole.Employee, [EmployeeRole.Admin]],
    [EmployeeRole.Manager, [EmployeeRole.Admin]],
    [EmployeeRole.Employee, [EmployeeRole.Admin, EmployeeRole.Manager]],
  ])(
    'nega o acesso com ForbiddenException quando o nível de acesso %s tenta acessar rota restrita a %s',
    (employeeRole, requiredRoles) => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      expect(() => guard.canActivate(createContext(employeeRole))).toThrow(
        new ForbiddenException(FORBIDDEN_ROLE_MESSAGE),
      );
    },
  );

  it('lança UnauthorizedException se a requisição não possuir funcionário autenticado', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([EmployeeRole.Admin]);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});
