import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeeRole } from '../../employees/entities/employee.entity';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockEmployeeRepository: {
    findOne: jest.Mock;
  };
  let mockDataSource: {
    getRepository: jest.Mock;
  };

  beforeEach(() => {
    mockEmployeeRepository = {
      findOne: jest.fn(),
    };
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockEmployeeRepository),
    };
    guard = new AdminGuard(mockDataSource as unknown as DataSource);
  });

  function createMockContext(
    headers: Record<string, string>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  it.each([
    ['admin', 'x-user-role'],
    ['admin', 'X-User-Role'],
  ])(
    'permite acesso quando role é %s no header %s',
    async (role, headerKey) => {
      const context = createMockContext({ [headerKey.toLowerCase()]: role });
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    },
  );

  it.each([
    ['emp-admin-1', EmployeeRole.Admin],
    ['emp-admin-2', EmployeeRole.Admin],
  ])(
    'permite acesso para funcionário %s com cargo %s no banco',
    async (employeeId, role) => {
      mockEmployeeRepository.findOne.mockResolvedValue({
        employeeId,
        role,
      });

      const context = createMockContext({ 'x-employee-id': employeeId });
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    },
  );

  it.each([
    ['employee', 'x-user-role'],
    ['manager', 'x-user-role'],
    ['guest', 'x-user-role'],
  ])(
    'rejeita acesso com ForbiddenException quando role é %s no header %s',
    async (role, headerKey) => {
      const context = createMockContext({ [headerKey]: role });
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    },
  );

  it.each([
    ['emp-common', EmployeeRole.Employee],
    ['emp-manager', EmployeeRole.Manager],
  ])(
    'rejeita acesso para funcionário %s com cargo %s no banco',
    async (employeeId, role) => {
      mockEmployeeRepository.findOne.mockResolvedValue({
        employeeId,
        role,
      });

      const context = createMockContext({ 'x-employee-id': employeeId });
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    },
  );

  it.each([
    [{}, 'nenhum header'],
    [{ 'x-unknown': 'true' }, 'header irrelevante'],
  ])('rejeita acesso quando %s é fornecido', async (headers) => {
    const context = createMockContext(headers);
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
