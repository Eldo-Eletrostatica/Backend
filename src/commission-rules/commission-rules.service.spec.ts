import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { CommissionRulesService } from './commission-rules.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import {
  CommissionCalculationType,
  CommissionRule,
  CommissionScope,
} from './entities/commission-rule.entity';

describe('CommissionRulesService', () => {
  let service: CommissionRulesService;
  let mockRuleRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockEmployeeRepository: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    mockRuleRepository = {
      create: jest.fn(
        (dto: Partial<CommissionRule>): CommissionRule =>
          ({
            commissionRuleId: 'rule-uuid-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            ...dto,
          }) as CommissionRule,
      ),
      save: jest.fn((rule: CommissionRule) => Promise.resolve(rule)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      softDelete: jest.fn(),
    };

    mockEmployeeRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionRulesService,
        {
          provide: getRepositoryToken(CommissionRule),
          useValue: mockRuleRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<CommissionRulesService>(CommissionRulesService);
  });

  describe('create - cenários de sucesso', () => {
    it.each([
      [
        'Comissão Global 0-5k',
        CommissionCalculationType.Percentage,
        3,
        0,
        5000,
      ],
      [
        'Comissão Global 5-10k',
        CommissionCalculationType.Percentage,
        5,
        5000.01,
        10000,
      ],
    ])(
      'cadastra regra global percentual por faixa com sucesso (Cenário 1): %s',
      async (name, calculationType, value, minAmount, maxAmount) => {
        const mockQb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        mockRuleRepository.createQueryBuilder.mockReturnValue(mockQb);

        const dto: CreateCommissionRuleDto = {
          name,
          calculationType,
          value,
          scope: CommissionScope.Global,
          minAmount,
          maxAmount,
        };

        const result = await service.create(dto);
        expect(result.name).toBe(name);
        expect(result.scope).toBe(CommissionScope.Global);
        expect(result.employeeId).toBeNull();
        expect(result.minAmount).toBe(minAmount);
        expect(result.maxAmount).toBe(maxAmount);
      },
    );

    it.each([
      ['emp-joao-id', 80, 10000.01, null],
      ['emp-maria-id', 120, 20000, 50000],
    ])(
      'cadastra regra fixa específica por funcionário com sucesso (Cenário 2): %s',
      async (employeeId, value, minAmount, maxAmount) => {
        mockEmployeeRepository.findOne.mockResolvedValue({
          employeeId,
          name: 'Funcionário Teste',
        });

        const mockQb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        mockRuleRepository.createQueryBuilder.mockReturnValue(mockQb);

        const dto: CreateCommissionRuleDto = {
          name: 'Regra Especial',
          calculationType: CommissionCalculationType.Fixed,
          value,
          scope: CommissionScope.Employee,
          employeeId,
          minAmount,
          maxAmount: maxAmount ?? undefined,
        };

        const result = await service.create(dto);
        expect(result.employeeId).toBe(employeeId);
        expect(result.calculationType).toBe(CommissionCalculationType.Fixed);
        expect(result.value).toBe(value);
      },
    );
  });

  describe('create - validação de conflito de faixas (Cenário 3)', () => {
    it.each([
      [1000, 3000, 2000, 4000],
      [0, 5000, 1000, 2000],
      [5000, null, 8000, null],
      [1000, 5000, 500, 1000],
    ])(
      'rejeita cadastro com ConflictException quando faixa [%s, %s] conflita com [%s, %s]',
      async (existingMin, existingMax, candMin, candMax) => {
        const existingRule = {
          commissionRuleId: 'rule-existente',
          scope: CommissionScope.Global,
          employeeId: null,
          minAmount: existingMin,
          maxAmount: existingMax,
          isActive: true,
        };

        const mockQb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([existingRule]),
        };
        mockRuleRepository.createQueryBuilder.mockReturnValue(mockQb);

        const dto: CreateCommissionRuleDto = {
          name: 'Regra Conflitante',
          calculationType: CommissionCalculationType.Percentage,
          value: 5,
          scope: CommissionScope.Global,
          minAmount: candMin,
          maxAmount: candMax ?? undefined,
        };

        await expect(service.create(dto)).rejects.toThrow(ConflictException);
      },
    );
  });

  describe('create - validações de entrada inválida', () => {
    it.each([
      [0, CommissionCalculationType.Percentage],
      [-10, CommissionCalculationType.Fixed],
    ])(
      'rejeita valor da regra (%s) inválido para tipo %s',
      async (value, calculationType) => {
        const dto: CreateCommissionRuleDto = {
          name: 'Regra Inválida',
          calculationType,
          value,
          scope: CommissionScope.Global,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      },
    );

    it.each([
      [100.01, CommissionCalculationType.Percentage],
      [150, CommissionCalculationType.Percentage],
    ])(
      'rejeita percentual superior a 100%% (%s)',
      async (value, calculationType) => {
        const dto: CreateCommissionRuleDto = {
          name: 'Regra Inválida',
          calculationType,
          value,
          scope: CommissionScope.Global,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      },
    );

    it.each([
      [CommissionScope.Employee, undefined, 'sem employeeId'],
      [
        CommissionScope.Global,
        'some-emp-id',
        'com employeeId em escopo global',
      ],
    ])('rejeita inconsistência de escopo %s: %s', async (scope, employeeId) => {
      const dto: CreateCommissionRuleDto = {
        name: 'Regra Escopo Inválido',
        calculationType: CommissionCalculationType.Fixed,
        value: 50,
        scope,
        employeeId,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it.each([
      [-1, 1000, 'minAmount negativo'],
      [5000, 2000, 'minAmount maior que maxAmount'],
    ])(
      'rejeita limites inválidos de faixa (%s, %s): %s',
      async (minAmount, maxAmount) => {
        const dto: CreateCommissionRuleDto = {
          name: 'Regra Faixa Inválida',
          calculationType: CommissionCalculationType.Fixed,
          value: 50,
          scope: CommissionScope.Global,
          minAmount,
          maxAmount,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      },
    );

    it.each([
      ['emp-inexistente-1', 'Funcionário não encontrado.'],
      ['emp-inexistente-2', 'Funcionário não encontrado.'],
    ])(
      'lança NotFoundException quando funcionário %s não existe',
      async (employeeId) => {
        mockEmployeeRepository.findOne.mockResolvedValue(null);

        const dto: CreateCommissionRuleDto = {
          name: 'Regra Func Inexistente',
          calculationType: CommissionCalculationType.Fixed,
          value: 50,
          scope: CommissionScope.Employee,
          employeeId,
        };

        await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      },
    );
  });

  describe('findAll, findOne, update e remove', () => {
    it.each([
      [CommissionScope.Global, true],
      [CommissionScope.Employee, false],
    ])(
      'lista regras filtrando por escopo %s e isActive %s',
      async (scope, isActive) => {
        const mockQb = {
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            {
              commissionRuleId: 'r1',
              name: 'Regra 1',
              scope,
              isActive,
              minAmount: 0,
              maxAmount: null,
              value: 5,
              calculationType: CommissionCalculationType.Percentage,
            },
          ]),
        };
        mockRuleRepository.createQueryBuilder.mockReturnValue(mockQb);

        const result = await service.findAll({ scope, isActive });
        expect(result).toHaveLength(1);
        expect(result[0].scope).toBe(scope);
      },
    );

    it.each([
      ['valid-uuid-1', 'Regra 1'],
      ['valid-uuid-2', 'Regra 2'],
    ])('busca regra existente por id %s (%s)', async (id, name) => {
      mockRuleRepository.findOne.mockResolvedValue({
        commissionRuleId: id,
        name,
        scope: CommissionScope.Global,
        minAmount: 0,
        maxAmount: null,
        value: 10,
        calculationType: CommissionCalculationType.Percentage,
      });

      const result = await service.findOne(id);
      expect(result.commissionRuleId).toBe(id);
      expect(result.name).toBe(name);
    });

    it.each([['invalid-id-1'], ['invalid-id-2']])(
      'lança NotFoundException ao buscar id inexistente %s',
      async (id) => {
        mockRuleRepository.findOne.mockResolvedValue(null);
        await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      },
    );

    it.each([
      ['r1', 'Novo Nome', 10],
      ['r2', 'Outro Nome', 15],
    ])(
      'atualiza regra %s com novo nome (%s) e valor (%s)',
      async (id, name, value) => {
        const existing = {
          commissionRuleId: id,
          name: 'Antigo',
          scope: CommissionScope.Global,
          calculationType: CommissionCalculationType.Percentage,
          value: 5,
          minAmount: 0,
          maxAmount: 1000,
          isActive: true,
        };
        mockRuleRepository.findOne.mockResolvedValue(existing);

        const mockQb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        mockRuleRepository.createQueryBuilder.mockReturnValue(mockQb);

        const result = await service.update(id, { name, value });
        expect(result.name).toBe(name);
        expect(result.value).toBe(value);
      },
    );

    it.each([['del-1'], ['del-2']])(
      'aplica soft delete na regra %s',
      async (id) => {
        mockRuleRepository.findOne.mockResolvedValue({ commissionRuleId: id });
        await service.remove(id);
        expect(mockRuleRepository.softDelete).toHaveBeenCalledWith(id);
      },
    );
  });
});
