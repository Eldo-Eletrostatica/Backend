import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee, EmployeeRole } from '../employees/entities/employee.entity';
import {
  AuthService,
  INVALID_CREDENTIALS_MESSAGE,
  UNAUTHORIZED_MESSAGE,
} from './auth.service';
import { hashPassword } from './password-hash';

describe('AuthService', () => {
  let service: AuthService;
  const mockFindOne = jest.fn();
  const mockExists = jest.fn();
  const mockCreate = jest.fn();
  const mockSave = jest.fn();

  const mockEmployeeRepository = {
    findOne: mockFindOne,
    exists: mockExists,
    create: mockCreate,
    save: mockSave,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  const buildEmployee = async (
    role: EmployeeRole = EmployeeRole.Employee,
  ): Promise<Employee> => ({
    employeeId: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Oliveira',
    email: 'maria@eldo.com.br',
    passwordHash: await hashPassword('SenhaSegura@123'),
    role,
    commissionType: null,
    commissionValue: null,
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    deletedAt: null,
  });

  describe('login', () => {
    it('autentica credenciais válidas e retorna token JWT e dados do funcionário', async () => {
      const employee = await buildEmployee(EmployeeRole.Admin);
      mockFindOne.mockResolvedValue(employee);

      const result = await service.login({
        email: '  MARIA@ELDO.COM.BR ',
        password: 'SenhaSegura@123',
      });

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { email: 'maria@eldo.com.br' },
      });
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.employee).toEqual({
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: EmployeeRole.Admin,
      });
    });

    it('provisiona o administrador inicial no primeiro login quando não há administrador no banco', async () => {
      mockFindOne.mockResolvedValue(null);
      mockExists.mockResolvedValue(false);
      mockCreate.mockImplementation((entity: Partial<Employee>) => entity);
      mockSave.mockImplementation(async (entity: Partial<Employee>) => ({
        ...(await buildEmployee(EmployeeRole.Admin)),
        ...entity,
      }));

      const result = await service.login({
        email: 'admin@eldo.com.br',
        password: 'Admin@123',
      });

      expect(result.employee.role).toBe(EmployeeRole.Admin);
      expect(result.employee.email).toBe('admin@eldo.com.br');
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['e-mail não cadastrado', false, 'SenhaSegura@123'],
      ['senha incorreta', true, 'SenhaErrada@999'],
    ])(
      'lança UnauthorizedException com a mesma mensagem genérica para %s (%s)',
      async (_case, employeeExists, passwordAttempt) => {
        const employee = employeeExists ? await buildEmployee() : null;
        mockFindOne.mockResolvedValue(employee);

        await expect(
          service.login({
            email: 'maria@eldo.com.br',
            password: passwordAttempt,
          }),
        ).rejects.toThrow(
          new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
        );
      },
    );
  });

  describe('validateAccessToken', () => {
    it('valida um token emitido e retorna o funcionário atualizado do banco', async () => {
      const employee = await buildEmployee(EmployeeRole.Manager);
      mockFindOne.mockResolvedValue(employee);

      const { accessToken } = await service.login({
        email: employee.email,
        password: 'SenhaSegura@123',
      });

      const validated = await service.validateAccessToken(accessToken);
      expect(validated).toEqual({
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: EmployeeRole.Manager,
      });
    });

    it('rejeita token quando o funcionário foi removido após a emissão', async () => {
      const employee = await buildEmployee();
      mockFindOne.mockResolvedValueOnce(employee).mockResolvedValueOnce(null);

      const { accessToken } = await service.login({
        email: employee.email,
        password: 'SenhaSegura@123',
      });

      await expect(service.validateAccessToken(accessToken)).rejects.toThrow(
        new UnauthorizedException(UNAUTHORIZED_MESSAGE),
      );
    });

    it.each([
      ['token malformado', 'token-invalido'],
      ['token vazio', ''],
    ])('rejeita %s com UnauthorizedException', async (_case, invalidToken) => {
      await expect(service.validateAccessToken(invalidToken)).rejects.toThrow(
        new UnauthorizedException(UNAUTHORIZED_MESSAGE),
      );
    });
  });
});
