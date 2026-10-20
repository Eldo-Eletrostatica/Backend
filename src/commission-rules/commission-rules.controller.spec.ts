import { Test, TestingModule } from '@nestjs/testing';
import { CommissionRulesController } from './commission-rules.controller';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRuleResponseDto } from './dto/commission-rule-response.dto';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import {
  CommissionCalculationType,
  CommissionScope,
} from './entities/commission-rule.entity';
import { AdminGuard } from './guards/admin.guard';

describe('CommissionRulesController', () => {
  let controller: CommissionRulesController;
  let mockService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionRulesController],
      providers: [
        {
          provide: CommissionRulesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommissionRulesController>(
      CommissionRulesController,
    );
  });

  it.each([
    ['Regra 1', CommissionCalculationType.Percentage, 5],
    ['Regra 2', CommissionCalculationType.Fixed, 50],
  ])(
    'chama create com nome %s, tipo %s e valor %s',
    async (name, calculationType, value) => {
      const dto: CreateCommissionRuleDto = {
        name,
        calculationType,
        value,
        scope: CommissionScope.Global,
      };
      const response: CommissionRuleResponseDto = {
        commissionRuleId: 'uuid',
        name,
        description: null,
        calculationType,
        value,
        scope: CommissionScope.Global,
        employeeId: null,
        minAmount: 0,
        maxAmount: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockService.create.mockResolvedValue(response);

      const result = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result.name).toBe(name);
    },
  );

  it.each([
    [CommissionScope.Global, true],
    [CommissionScope.Employee, false],
  ])('chama findAll com escopo %s e isActive %s', async (scope, isActive) => {
    mockService.findAll.mockResolvedValue([]);
    await controller.findAll({ scope, isActive });
    expect(mockService.findAll).toHaveBeenCalledWith({ scope, isActive });
  });

  it.each([
    ['uuid-1', 'Regra A'],
    ['uuid-2', 'Regra B'],
  ])('chama findOne para id %s e retorna %s', async (id, name) => {
    mockService.findOne.mockResolvedValue({ commissionRuleId: id, name });
    const result = await controller.findOne(id);
    expect(mockService.findOne).toHaveBeenCalledWith(id);
    expect(result.commissionRuleId).toBe(id);
  });

  it.each([
    ['uuid-1', 'Atualizado 1'],
    ['uuid-2', 'Atualizado 2'],
  ])('chama update para id %s com novo nome %s', async (id, name) => {
    mockService.update.mockResolvedValue({ commissionRuleId: id, name });
    const result = await controller.update(id, { name });
    expect(mockService.update).toHaveBeenCalledWith(id, { name });
    expect(result.name).toBe(name);
  });

  it.each([['uuid-del-1'], ['uuid-del-2']])(
    'chama remove para id %s',
    async (id) => {
      mockService.remove.mockResolvedValue(undefined);
      await controller.remove(id);
      expect(mockService.remove).toHaveBeenCalledWith(id);
    },
  );
});
