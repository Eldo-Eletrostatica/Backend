import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee, EmployeeRole } from '../employees/entities/employee.entity';
import {
  AuthService,
  INVALID_CREDENTIALS_MESSAGE,
  UNAUTHORIZED_MESSAGE,
} from './auth.service';
import { hashPassword, verifyPassword } from './password-hash';

describe('AuthService', () => {
  let service: AuthService;
  let envValues: Record<string, string | undefined>;
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

  const mockConfigService = {
    get: jest.fn((key: string) => envValues[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = envValues[key];
      if (!value) {
        throw new Error(`Configuration key "${key}" does not exist`);
      }
      return value;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    envValues = {
      JWT_SECRET: 'test-jwt-secret',
      INITIAL_ADMIN_NAME: 'Administrador Eldo',
      INITIAL_ADMIN_EMAIL: 'admin@eldo.com.br',
      INITIAL_ADMIN_PASSWORD: 'Admin@123',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
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

  it('falha ao instanciar quando JWT_SECRET não está configurado', () => {
    delete envValues.JWT_SECRET;

    expect(
      () =>
        new AuthService(
          mockConfigService as unknown as ConfigService,
          mockEmployeeRepository as never,
        ),
    ).toThrow('JWT_SECRET');
  });

  describe('login', () => {
    it('autentica credenciais válidas e retorna token JWT e dados do funcionário', async () => {
      const employee = await buildEmployee(EmployeeRole.Admin);
      mockFindOne.mockResolvedValue(employee);

      const result = await service.login({
        email: 'maria@eldo.com.br',
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

    it('provisiona o administrador inicial com senha em hash quando não há administrador no banco', async () => {
      let savedAdmin: Partial<Employee> = {};
      mockFindOne.mockResolvedValue(null);
      mockExists.mockResolvedValue(false);
      mockCreate.mockImplementation((entity: Partial<Employee>) => {
        savedAdmin = entity;
        return entity;
      });
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
      expect(savedAdmin.passwordHash).toBeDefined();
      expect(savedAdmin.passwordHash).not.toBe('Admin@123');
      expect(
        await verifyPassword('Admin@123', savedAdmin.passwordHash ?? ''),
      ).toBe(true);
    });

    it('não cria o administrador inicial quando já existe um administrador no banco', async () => {
      mockFindOne.mockResolvedValue(null);
      mockExists.mockResolvedValue(true);

      await expect(
        service.login({
          email: 'admin@eldo.com.br',
          password: 'Admin@123',
        }),
      ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));

      expect(mockSave).not.toHaveBeenCalled();
    });

    it.each([
      ['INITIAL_ADMIN_EMAIL ausente', undefined, 'Admin@123'],
      ['INITIAL_ADMIN_PASSWORD ausente', 'admin@eldo.com.br', undefined],
    ])(
      'não cria o administrador inicial quando %s',
      async (_case, initialEmail, initialPassword) => {
        envValues.INITIAL_ADMIN_EMAIL = initialEmail;
        envValues.INITIAL_ADMIN_PASSWORD = initialPassword;
        mockFindOne.mockResolvedValue(null);

        await expect(
          service.login({
            email: 'admin@eldo.com.br',
            password: 'Admin@123',
          }),
        ).rejects.toThrow(
          new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
        );

        expect(mockExists).not.toHaveBeenCalled();
        expect(mockSave).not.toHaveBeenCalled();
      },
    );

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
