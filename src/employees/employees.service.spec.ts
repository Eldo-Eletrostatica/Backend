import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { verifyPassword } from '../auth/password-hash';
import {
  EMAIL_IN_USE_MESSAGE,
  EMPLOYEE_NOT_FOUND_MESSAGE,
  EmployeesService,
} from './employees.service';
import {
  CommissionType,
  Employee,
  EmployeeRole,
} from './entities/employee.entity';

describe('EmployeesService', () => {
  let service: EmployeesService;
  const mockExists = jest.fn();
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  const mockCreate = jest.fn();
  const mockSave = jest.fn();
  const mockSoftRemove = jest.fn();

  const mockEmployeeRepository = {
    exists: mockExists,
    findOne: mockFindOne,
    find: mockFind,
    create: mockCreate,
    save: mockSave,
    softRemove: mockSoftRemove,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  const sampleEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    employeeId: '22222222-2222-4222-8222-222222222222',
    name: 'Carlos Mendes',
    email: 'carlos@eldo.com.br',
    passwordHash: 'scrypt$salt$hash',
    role: EmployeeRole.Employee,
    commissionType: null,
    commissionValue: null,
    createdAt: new Date('2026-10-10T12:00:00Z'),
    updatedAt: new Date('2026-10-10T12:00:00Z'),
    deletedAt: null,
    ...overrides,
  });

  describe('create', () => {
    it.each([
      [EmployeeRole.Admin, 'Administrador'],
      [EmployeeRole.Manager, 'Gestor'],
      [EmployeeRole.Employee, 'Funcionário'],
    ])(
      'cadastra funcionário com nível %s (%s) e armazena hash da senha',
      async (role) => {
        let capturedEntity: Partial<Employee> = {};
        mockExists.mockResolvedValue(false);
        mockCreate.mockImplementation((entity: Partial<Employee>) => {
          capturedEntity = entity;
          return entity;
        });
        mockSave.mockImplementation((entity: Partial<Employee>) =>
          Promise.resolve({
            ...sampleEmployee(),
            ...entity,
            role,
          }),
        );

        const result = await service.create({
          name: '  Carlos Mendes ',
          email: '  CARLOS@ELDO.COM.BR ',
          password: 'Senha@123',
          role,
        });

        expect(result.role).toBe(role);
        expect(result.email).toBe('carlos@eldo.com.br');
        expect(result.name).toBe('Carlos Mendes');
        expect(result).not.toHaveProperty('passwordHash');
        expect(
          await verifyPassword('Senha@123', capturedEntity.passwordHash ?? ''),
        ).toBe(true);
      },
    );

    it('lança ConflictException quando o e-mail já está em uso por funcionário ativo', async () => {
      mockExists.mockResolvedValue(true);

      await expect(
        service.create({
          name: 'Duplicado',
          email: 'carlos@eldo.com.br',
          password: 'Senha@123',
          role: EmployeeRole.Employee,
        }),
      ).rejects.toThrow(new ConflictException(EMAIL_IN_USE_MESSAGE));

      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('findAll e findOne', () => {
    it('lista funcionários ativos convertendo commissionValue e omitindo passwordHash', async () => {
      mockFind.mockResolvedValue([
        sampleEmployee({
          commissionType: CommissionType.Percentage,
          commissionValue: 5,
        }),
      ]);

      const list = await service.findAll();
      expect(list).toHaveLength(1);
      expect(list[0].commissionValue).toBe(5);
      expect(list[0]).not.toHaveProperty('passwordHash');
    });

    it('lança NotFoundException quando funcionário não existe', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        service.findOne('99999999-9999-4999-8999-999999999999'),
      ).rejects.toThrow(new NotFoundException(EMPLOYEE_NOT_FOUND_MESSAGE));
    });
  });

  describe('update', () => {
    it('atualiza nome, e-mail, senha e nível de permissão do funcionário', async () => {
      const existing = sampleEmployee();
      mockFindOne.mockResolvedValue(existing);
      mockExists.mockResolvedValue(false);
      mockSave.mockImplementation((emp: Employee) => Promise.resolve(emp));

      const updated = await service.update(existing.employeeId, {
        name: 'Carlos Atualizado',
        email: 'novo@eldo.com.br',
        password: 'NovaSenha@456',
        role: EmployeeRole.Manager,
      });

      expect(updated.name).toBe('Carlos Atualizado');
      expect(updated.email).toBe('novo@eldo.com.br');
      expect(updated.role).toBe(EmployeeRole.Manager);
      expect(await verifyPassword('NovaSenha@456', existing.passwordHash)).toBe(
        true,
      );
    });

    it('rejeita atualização para um e-mail já em uso por outro funcionário', async () => {
      const existing = sampleEmployee();
      mockFindOne.mockResolvedValue(existing);
      mockExists.mockResolvedValue(true);

      await expect(
        service.update(existing.employeeId, {
          email: 'ocupado@eldo.com.br',
        }),
      ).rejects.toThrow(new ConflictException(EMAIL_IN_USE_MESSAGE));
    });
  });

  describe('remove', () => {
    it('aplica exclusão lógica via softRemove no funcionário ativo', async () => {
      const existing = sampleEmployee();
      mockFindOne.mockResolvedValue(existing);
      mockSoftRemove.mockResolvedValue(existing);

      await service.remove(existing.employeeId);

      expect(mockSoftRemove).toHaveBeenCalledWith(existing);
    });
  });
});
