import { Test, TestingModule } from '@nestjs/testing';
import { CommissionType } from '../employees/entities/employee.entity';
import { CommissionRulesController } from './commission-rules.controller';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRuleResponseDto } from './dto/commission-rule-response.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';

describe('CommissionRulesController', () => {
  let controller: CommissionRulesController;
  let mockService: {
    getRule: jest.Mock;
    updateRule: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      getRule: jest.fn(),
      updateRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionRulesController],
      providers: [
        {
          provide: CommissionRulesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CommissionRulesController>(
      CommissionRulesController,
    );
  });

  it.each([
    ['emp-1', CommissionType.Percentage, 5],
    ['emp-2', CommissionType.Fixed, 80],
    ['emp-3', null, null],
  ])(
    'delegates getRule for employee %s with type %s and value %s',
    async (employeeId, commissionType, commissionValue) => {
      const response: CommissionRuleResponseDto = {
        employeeId,
        commissionType,
        commissionValue,
        updatedAt: new Date(),
      };
      mockService.getRule.mockResolvedValue(response);

      const result = await controller.getRule(employeeId);
      expect(mockService.getRule).toHaveBeenCalledWith(employeeId);
      expect(result.employeeId).toBe(employeeId);
      expect(result.commissionType).toBe(commissionType);
      expect(result.commissionValue).toBe(commissionValue);
    },
  );

  it.each([
    ['emp-1', CommissionType.Percentage, 5],
    ['emp-2', CommissionType.Fixed, 80],
    ['emp-3', null, null],
  ])(
    'delegates updateRule for employee %s with type %s and value %s',
    async (employeeId, commissionType, commissionValue) => {
      const dto: UpdateCommissionRuleDto = {
        commissionType,
        commissionValue,
      };
      const response: CommissionRuleResponseDto = {
        employeeId,
        commissionType,
        commissionValue,
        updatedAt: new Date(),
      };
      mockService.updateRule.mockResolvedValue(response);

      const result = await controller.updateRule(employeeId, dto);
      expect(mockService.updateRule).toHaveBeenCalledWith(employeeId, dto);
      expect(result.employeeId).toBe(employeeId);
      expect(result.commissionType).toBe(commissionType);
      expect(result.commissionValue).toBe(commissionValue);
    },
  );
});
