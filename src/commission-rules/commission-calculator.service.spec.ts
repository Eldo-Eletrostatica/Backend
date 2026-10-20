import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';
import {
  calculateRuleCommission,
  CommissionCalculatorService,
  NO_COMMISSION,
} from './commission-calculator.service';
import {
  CommissionCalculationType,
  CommissionRule,
  CommissionScope,
} from './entities/commission-rule.entity';

describe('calculateRuleCommission', () => {
  it.each([
    [CommissionCalculationType.Percentage, 5, 1000, 50],
    [CommissionCalculationType.Percentage, 3, 2500, 75],
    [CommissionCalculationType.Percentage, 2.5, 1234.56, 30.86],
    [CommissionCalculationType.Fixed, 80, 15000, 80],
    [CommissionCalculationType.Fixed, 50, 200, 50],
  ])(
    'calcula comissão do tipo %s de %s sobre venda de %s resultando em %s',
    (calculationType, value, saleAmount, expectedCommission) => {
      const result = calculateRuleCommission(
        { calculationType, value },
        saleAmount,
      );
      expect(result).toBe(expectedCommission);
    },
  );

  it.each([
    [CommissionCalculationType.Percentage, 0, 1000],
    [CommissionCalculationType.Percentage, -5, 1000],
    [CommissionCalculationType.Percentage, 10, 0],
    [CommissionCalculationType.Fixed, 50, -100],
  ])(
    'retorna NO_COMMISSION quando valor da regra (%s) ou venda (%s) é inválido',
    (calculationType, value, saleAmount) => {
      const result = calculateRuleCommission(
        { calculationType, value },
        saleAmount,
      );
      expect(result).toBe(NO_COMMISSION);
    },
  );
});

describe('CommissionCalculatorService', () => {
  let service: CommissionCalculatorService;
  let mockRuleRepository: {
    createQueryBuilder: jest.Mock;
  };
  let mockEmployeeRepository: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    mockRuleRepository = {
      createQueryBuilder: jest.fn(),
    };
    mockEmployeeRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionCalculatorService,
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

    service = module.get<CommissionCalculatorService>(
      CommissionCalculatorService,
    );
  });

  it.each([
    ['emp-1', 2500, 75],
    ['emp-2', 5000, 150],
    ['emp-3', 1000, 30],
  ])(
    'aplica regra global de 3%% para vendedor %s em venda de %s dando %s (Cenário 4)',
    async (sellerId, saleAmount, expected) => {
      const mockEmployeeQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      const globalRule = {
        commissionRuleId: 'global-1',
        scope: CommissionScope.Global,
        calculationType: CommissionCalculationType.Percentage,
        value: 3,
        minAmount: 0,
        maxAmount: 5000,
        isActive: true,
      };

      const mockGlobalQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(globalRule),
      };

      mockRuleRepository.createQueryBuilder
        .mockReturnValueOnce(mockEmployeeQueryBuilder)
        .mockReturnValueOnce(mockGlobalQueryBuilder);

      const commission = await service.calculateCommission(
        sellerId,
        saleAmount,
      );
      expect(commission).toBe(expected);
    },
  );

  it.each([
    ['emp-joao', 12000, 80],
    ['emp-joao', 20000, 80],
  ])(
    'regra individual do vendedor %s sobrepõe regra global para venda de %s (Cenário 2)',
    async (sellerId, saleAmount, expected) => {
      const employeeRule = {
        commissionRuleId: 'rule-joao',
        scope: CommissionScope.Employee,
        employeeId: sellerId,
        calculationType: CommissionCalculationType.Fixed,
        value: 80,
        minAmount: 10000.01,
        maxAmount: null,
        isActive: true,
      };

      const mockEmployeeQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(employeeRule),
      };

      mockRuleRepository.createQueryBuilder.mockReturnValueOnce(
        mockEmployeeQueryBuilder,
      );

      const commission = await service.calculateCommission(
        sellerId,
        saleAmount,
      );
      expect(commission).toBe(expected);
      expect(mockRuleRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [CommissionType.Fixed, 100, 1000, 100],
    [CommissionType.Percentage, 5, 2000, 100],
  ])(
    'utiliza fallback do cadastro legado (%s de %s) para venda de %s resultando em %s',
    async (commissionType, commissionValue, saleAmount, expected) => {
      const emptyQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockRuleRepository.createQueryBuilder
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder);

      mockEmployeeRepository.findOne.mockResolvedValue({
        employeeId: 'legacy-emp',
        commissionType,
        commissionValue,
      });

      const commission = await service.calculateCommission(
        'legacy-emp',
        saleAmount,
      );
      expect(commission).toBe(expected);
    },
  );

  it.each([
    [0, 100],
    [-50, 100],
  ])(
    'retorna NO_COMMISSION quando o valor da venda (%s) é menor ou igual a zero',
    async (saleAmount) => {
      const commission = await service.calculateCommission('emp-1', saleAmount);
      expect(commission).toBe(NO_COMMISSION);
    },
  );
});
