import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, In } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import {
  Order,
  OrderStatus,
  SALE_STATUSES,
} from '../orders/entities/order.entity';
import { CommissionsService } from './commissions.service';
import { GetCommissionsQueryDto } from './dto/get-commissions-query.dto';

describe('CommissionsService', () => {
  let service: CommissionsService;
  let mockEmployeeRepository: {
    findOne: jest.Mock;
  };
  let mockOrderRepository: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockEmployeeRepository = {
      findOne: jest.fn(),
    };
    mockOrderRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
      ],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
  });

  describe('Validação de existência do funcionário', () => {
    it.each([
      ['00000000-0000-0000-0000-000000000001', 'Vendedor não encontrado.'],
      ['00000000-0000-0000-0000-000000000002', 'Vendedor não encontrado.'],
    ])(
      'lança NotFoundException quando funcionário %s não for encontrado',
      async (employeeId, expectedMessage) => {
        mockEmployeeRepository.findOne.mockResolvedValue(null);

        const query: GetCommissionsQueryDto = {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        };

        await expect(
          service.getAccumulatedCommissions(employeeId, query),
        ).rejects.toThrow(new NotFoundException(expectedMessage));

        expect(mockEmployeeRepository.findOne).toHaveBeenCalledWith({
          where: { employeeId },
        });
      },
    );
  });

  describe('Validação de datas e período', () => {
    it.each([
      [
        '2026-10-31',
        '2026-10-01',
        'A data inicial não pode ser posterior à data final.',
      ],
      [
        '2026-12-01',
        '2026-11-30',
        'A data inicial não pode ser posterior à data final.',
      ],
    ])(
      'lança BadRequestException quando startDate (%s) > endDate (%s)',
      async (startDate, endDate, expectedMessage) => {
        const employeeId = '00000000-0000-0000-0000-000000000001';
        mockEmployeeRepository.findOne.mockResolvedValue({
          employeeId,
        });

        const query: GetCommissionsQueryDto = { startDate, endDate };

        await expect(
          service.getAccumulatedCommissions(employeeId, query),
        ).rejects.toThrow(new BadRequestException(expectedMessage));
      },
    );
  });

  describe('Cálculo de comissões acumuladas', () => {
    it.each([
      ['emp-1', '2026-10-01', '2026-10-31'],
      ['emp-2', '2026-11-01', '2026-11-30'],
    ])(
      'retorna totais zerados e lista vazia quando não houver vendas no período para %s (%s a %s)',
      async (employeeId, startDate, endDate) => {
        mockEmployeeRepository.findOne.mockResolvedValue({
          employeeId,
        });
        mockOrderRepository.find.mockResolvedValue([]);

        const query: GetCommissionsQueryDto = { startDate, endDate };
        const result = await service.getAccumulatedCommissions(
          employeeId,
          query,
        );

        expect(result).toEqual({
          employeeId,
          startDate,
          endDate,
          totalCommission: 0,
          totalSalesValue: 0,
          salesCount: 0,
          sales: [],
        });
      },
    );

    it.each([
      [
        'emp-1',
        [
          {
            orderId: 'ord-1',
            trackingCode: 'A1B2C3D4',
            soldAt: new Date('2026-10-05T10:00:00.000Z'),
            finalPrice: 1000,
            commission: 50,
            status: OrderStatus.Queued,
          },
          {
            orderId: 'ord-2',
            trackingCode: 'E5F6G7H8',
            soldAt: new Date('2026-10-15T15:30:00.000Z'),
            finalPrice: 2000.5,
            commission: 100.25,
            status: OrderStatus.InProduction,
          },
        ],
        150.25,
        3000.5,
        2,
      ],
      [
        'emp-2',
        [
          {
            orderId: 'ord-3',
            trackingCode: 'J9K0L1M2',
            soldAt: new Date('2026-10-20T12:00:00.000Z'),
            finalPrice: 500,
            commission: 80,
            status: OrderStatus.Completed,
          },
        ],
        80,
        500,
        1,
      ],
    ])(
      'agrega comissões congeladas e vendas para %s resultando em totalCommission=%s',
      async (
        employeeId,
        orders,
        expectedCommission,
        expectedSalesValue,
        expectedCount,
      ) => {
        mockEmployeeRepository.findOne.mockResolvedValue({
          employeeId,
        });
        mockOrderRepository.find.mockResolvedValue(orders);

        const query: GetCommissionsQueryDto = {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        };

        const result = await service.getAccumulatedCommissions(
          employeeId,
          query,
        );

        expect(result.employeeId).toBe(employeeId);
        expect(result.totalCommission).toBe(expectedCommission);
        expect(result.totalSalesValue).toBe(expectedSalesValue);
        expect(result.salesCount).toBe(expectedCount);
        expect(result.sales).toHaveLength(expectedCount);
        expect(result.sales[0].orderId).toBe(orders[0].orderId);
      },
    );

    it.each([
      [
        '2026-10-01',
        '2026-10-31',
        new Date('2026-10-01T00:00:00.000-03:00'),
        new Date('2026-10-31T23:59:59.999-03:00'),
      ],
      [
        '2026-05-10',
        '2026-05-20',
        new Date('2026-05-10T00:00:00.000-03:00'),
        new Date('2026-05-20T23:59:59.999-03:00'),
      ],
    ])(
      'converte o período %s a %s para os limites exatos no fuso de Brasília (UTC-3)',
      async (startDate, endDate, expectedStart, expectedEnd) => {
        const employeeId = 'emp-fuso';
        mockEmployeeRepository.findOne.mockResolvedValue({
          employeeId,
        });
        mockOrderRepository.find.mockResolvedValue([]);

        const query: GetCommissionsQueryDto = { startDate, endDate };
        await service.getAccumulatedCommissions(employeeId, query);

        expect(mockOrderRepository.find).toHaveBeenCalledWith({
          where: {
            sellerEmployeeId: employeeId,
            status: In(SALE_STATUSES),
            soldAt: Between(expectedStart, expectedEnd),
          },
          order: {
            soldAt: 'ASC',
          },
        });
      },
    );
  });
});
