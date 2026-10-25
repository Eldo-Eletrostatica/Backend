import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { verifyPassword } from '../auth/password-hash';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  EMAIL_IN_USE_MESSAGE,
  EMPLOYEE_NOT_FOUND_MESSAGE,
  EmployeesService,
  LAST_ADMIN_MESSAGE,
} from './employees.service';
import {
  CommissionType,
  Employee,
  EmployeeRole,
} from './entities/employee.entity';

describe('EmployeesService', () => {
  let service: EmployeesService;
  const mockExists = jest.fn();
  const mockCount = jest.fn();
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  const mockCreate = jest.fn();
  const mockSave = jest.fn();
  const mockSoftRemove = jest.fn();

  const mockEmployeeRepository = {
    exists: mockExists,
    count: mockCount,
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

        const dto = plainToInstance(CreateEmployeeDto, {
          name: '  Carlos Mendes ',
          email: '  CARLOS@ELDO.COM.BR ',
          password: 'Senha@123',
          role,
        });

        const result = await service.create(dto);

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
    it('lista funcionários ativos em ordem alfabética convertendo commissionValue e omitindo passwordHash', async () => {
      mockFind.mockResolvedValue([
        sampleEmployee({
          name: 'Ana Souza',
          commissionType: CommissionType.Percentage,
          commissionValue: 5,
        }),
        sampleEmployee({
          name: 'Bruno Lima',
        }),
      ]);

      const list = await service.findAll();
      expect(mockFind).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(list.map((item) => item.name)).toEqual([
        'Ana Souza',
        'Bruno Lima',
      ]);
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

  describe('update e remove', () => {
    it('atualiza nome, e-mail, senha e nível de permissão do funcionário', async () => {
      const existing = sampleEmployee();
      mockFindOne.mockResolvedValue(existing);
      mockExists.mockResolvedValue(false);
      mockSave.mockImplementation((emp: Employee) => Promise.resolve(emp));

      const dto = plainToInstance(UpdateEmployeeDto, {
        name: '  Carlos Atualizado ',
        email: '  NOVO@ELDO.COM.BR ',
        password: 'NovaSenha@456',
        role: EmployeeRole.Manager,
      });

      const updated = await service.update(existing.employeeId, dto);

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

    it('aplica exclusão lógica via softRemove no funcionário ativo', async () => {
      const existing = sampleEmployee();
      mockFindOne.mockResolvedValue(existing);
      mockSoftRemove.mockResolvedValue(existing);

      await service.remove(existing.employeeId);

      expect(mockSoftRemove).toHaveBeenCalledWith(existing);
    });

    it.each([
      ['remover o último administrador', 'remove', undefined],
      [
        'rebaixar o último administrador para manager',
        'update',
        EmployeeRole.Manager,
      ],
      [
        'rebaixar o último administrador para employee',
        'update',
        EmployeeRole.Employee,
      ],
    ] as const)(
      'lança ConflictException ao tentar %s (%s)',
      async (_description, operation, targetRole) => {
        const lastAdmin = sampleEmployee({ role: EmployeeRole.Admin });
        mockFindOne.mockResolvedValue(lastAdmin);
        mockCount.mockResolvedValue(1);

        const action =
          operation === 'remove'
            ? service.remove(lastAdmin.employeeId)
            : service.update(lastAdmin.employeeId, { role: targetRole });

        await expect(action).rejects.toThrow(
          new ConflictException(LAST_ADMIN_MESSAGE),
        );
        expect(mockSave).not.toHaveBeenCalled();
        expect(mockSoftRemove).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['name', null],
      ['email', null],
      ['role', null],
      ['password', null],
    ] as const)(
      'rejeita null no campo %s do UpdateEmployeeDto (%s)',
      async (field, value) => {
        const dto = plainToInstance(UpdateEmployeeDto, { [field]: value });
        const errors = await validate(dto);

        expect(errors.map((err) => err.property)).toContain(field);
      },
    );
  });
});
