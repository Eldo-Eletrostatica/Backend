import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';
import { CommissionRulesService } from './commission-rules.service';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';

describe('CommissionRulesService', () => {
  let service: CommissionRulesService;
  let mockEmployeeRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockEmployeeRepository = {
      findOne: jest.fn(),
      save: jest.fn((emp: Employee) => Promise.resolve(emp)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionRulesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<CommissionRulesService>(CommissionRulesService);
  });

  describe('updateRule - successful updates', () => {
    it.each([
      [CommissionType.Percentage, 5],
      [CommissionType.Percentage, 2.5],
      [CommissionType.Fixed, 150],
      [CommissionType.Fixed, 80],
    ])(
      'updates employee commission rule to type %s and value %s',
      async (commissionType, commissionValue) => {
        const employeeId = 'emp-uuid-1';
        const existingEmployee = {
          employeeId,
          commissionType: null,
          commissionValue: null,
          updatedAt: new Date(),
        } as Employee;

        mockEmployeeRepository.findOne.mockResolvedValue(existingEmployee);

        const dto: UpdateCommissionRuleDto = {
          commissionType,
          commissionValue,
        };

        const result = await service.updateRule(employeeId, dto);

        expect(mockEmployeeRepository.findOne).toHaveBeenCalledWith({
          where: { employeeId },
        });
        expect(mockEmployeeRepository.save).toHaveBeenCalled();
        expect(result.commissionType).toBe(commissionType);
        expect(result.commissionValue).toBe(commissionValue);
      },
    );

    it.each([
      [null, null, 'emp-1'],
      [null, null, 'emp-2'],
    ])(
      'clears commission rule when both type and value are null for %s',
      async (commissionType, commissionValue, employeeId) => {
        const existingEmployee = {
          employeeId,
          commissionType: CommissionType.Percentage,
          commissionValue: 5,
          updatedAt: new Date(),
        } as Employee;

        mockEmployeeRepository.findOne.mockResolvedValue(existingEmployee);

        const dto: UpdateCommissionRuleDto = {
          commissionType,
          commissionValue,
        };

        const result = await service.updateRule(employeeId, dto);

        expect(result.commissionType).toBeNull();
        expect(result.commissionValue).toBeNull();
      },
    );
  });

  describe('updateRule - validation errors', () => {
    it.each([
      [CommissionType.Percentage, null, 'type provided without value'],
      [null, 5, 'value provided without type'],
      [CommissionType.Fixed, null, 'fixed type without value'],
    ])(
      'throws BadRequestException on mismatched pair (%s, %s): %s',
      async (commissionType, commissionValue) => {
        const dto: UpdateCommissionRuleDto = {
          commissionType,
          commissionValue,
        };

        await expect(service.updateRule('emp-1', dto)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it.each([
      [CommissionType.Percentage, 0],
      [CommissionType.Percentage, -5],
      [CommissionType.Fixed, 0],
      [CommissionType.Fixed, -50],
    ])(
      'throws BadRequestException when commission value (%s) is <= 0 for type %s',
      async (commissionType, commissionValue) => {
        const dto: UpdateCommissionRuleDto = {
          commissionType,
          commissionValue,
        };

        await expect(service.updateRule('emp-1', dto)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it.each([
      [CommissionType.Percentage, 100.01],
      [CommissionType.Percentage, 150],
    ])(
      'throws BadRequestException when percentage (%s) exceeds 100%%',
      async (commissionType, commissionValue) => {
        const dto: UpdateCommissionRuleDto = {
          commissionType,
          commissionValue,
        };

        await expect(service.updateRule('emp-1', dto)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it.each([
      [CommissionType.Fixed, 10_000_000_000],
      [CommissionType.Fixed, 99_999_999_999],
    ])(
      'throws BadRequestException when fixed value (%s) exceeds MAX_COMMISSION_VALUE',
      async (commissionType, commissionValue) => {
        const dto: UpdateCommissionRuleDto = {
          commissionType,
          commissionValue,
        };

        await expect(service.updateRule('emp-1', dto)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it.each([
      ['non-existent-1', 'Funcionário não encontrado.'],
      ['non-existent-2', 'Funcionário não encontrado.'],
    ])(
      'throws NotFoundException when employee %s is not found',
      async (employeeId, expectedMessage) => {
        mockEmployeeRepository.findOne.mockResolvedValue(null);

        const dto: UpdateCommissionRuleDto = {
          commissionType: CommissionType.Percentage,
          commissionValue: 5,
        };

        await expect(service.updateRule(employeeId, dto)).rejects.toThrow(
          new NotFoundException(expectedMessage),
        );
      },
    );
  });

  describe('getRule', () => {
    it.each([
      ['emp-1', CommissionType.Percentage, 5],
      ['emp-2', CommissionType.Fixed, 100],
      ['emp-3', null, null],
    ])(
      'returns current commission rule for employee %s (%s, %s)',
      async (employeeId, commissionType, commissionValue) => {
        const employee = {
          employeeId,
          commissionType,
          commissionValue,
          updatedAt: new Date(),
        } as Employee;

        mockEmployeeRepository.findOne.mockResolvedValue(employee);

        const result = await service.getRule(employeeId);
        expect(result.employeeId).toBe(employeeId);
        expect(result.commissionType).toBe(commissionType);
        expect(result.commissionValue).toBe(commissionValue);
      },
    );

    it.each([
      ['missing-1', 'Funcionário não encontrado.'],
      ['missing-2', 'Funcionário não encontrado.'],
    ])(
      'throws NotFoundException when retrieving rule for missing employee %s',
      async (employeeId, expectedMessage) => {
        mockEmployeeRepository.findOne.mockResolvedValue(null);
        await expect(service.getRule(employeeId)).rejects.toThrow(
          new NotFoundException(expectedMessage),
        );
      },
    );
  });
});
