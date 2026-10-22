import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, In } from 'typeorm';
import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';
import {
  Order,
  OrderStatus,
  SALE_STATUSES,
} from '../orders/entities/order.entity';
import { CommissionsService } from './commissions.service';
import { PeriodQueryDto } from '../common/dto/period-query.dto';

describe('CommissionsService', () => {
  let service: CommissionsService;
  let mockEmployeeRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let mockOrderRepository: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockEmployeeRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
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

        const query: PeriodQueryDto = {
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

        const query: PeriodQueryDto = { startDate, endDate };

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

        const query: PeriodQueryDto = { startDate, endDate };
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

        const query: PeriodQueryDto = {
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

        const query: PeriodQueryDto = { startDate, endDate };
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

  describe('Relatório consolidado de comissões (getCommissionReport)', () => {
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
        const query: PeriodQueryDto = { startDate, endDate };
        await expect(service.getCommissionReport(query)).rejects.toThrow(
          new BadRequestException(expectedMessage),
        );
      },
    );

    it.each([
      [
        'período de outubro',
        '2026-10-01',
        '2026-10-31',
        [
          {
            employeeId: 'emp-1',
            name: 'Bernardo Silva',
            email: 'bernardo@eldo.com.br',
            commissionType: CommissionType.Percentage,
            commissionValue: 5,
            deletedAt: null,
          },
          {
            employeeId: 'emp-2',
            name: 'Aline Souza',
            email: 'aline@eldo.com.br',
            commissionType: CommissionType.Fixed,
            commissionValue: 50,
            deletedAt: null,
          },
        ],
        [
          {
            orderId: 'ord-1',
            sellerEmployeeId: 'emp-1',
            finalPrice: 1000,
            commission: 50,
            status: OrderStatus.Queued,
            soldAt: new Date('2026-10-05T12:00:00.000Z'),
          },
        ],
        {
          totalCommission: 50,
          totalSalesValue: 1000,
          totalSalesCount: 1,
          sellersCount: 2,
        },
      ],
      [
        'período de novembro com inativo',
        '2026-11-01',
        '2026-11-30',
        [
          {
            employeeId: 'emp-ativo',
            name: 'Clara Costa',
            email: 'clara@eldo.com.br',
            commissionType: CommissionType.Percentage,
            commissionValue: 10,
            deletedAt: null,
          },
          {
            employeeId: 'emp-inativo',
            name: 'Daniel Dias',
            email: 'daniel@eldo.com.br',
            commissionType: null,
            commissionValue: null,
            deletedAt: new Date('2026-11-20T10:00:00.000Z'),
          },
        ],
        [
          {
            orderId: 'ord-2',
            sellerEmployeeId: 'emp-inativo',
            finalPrice: 2000,
            commission: 150,
            status: OrderStatus.Completed,
            soldAt: new Date('2026-11-10T12:00:00.000Z'),
          },
        ],
        {
          totalCommission: 150,
          totalSalesValue: 2000,
          totalSalesCount: 1,
          sellersCount: 2,
        },
      ],
    ])(
      'agrega comissões e totalizadores para %s (%s a %s)',
      async (
        _scenario,
        startDate,
        endDate,
        employees,
        orders,
        expectedSummary,
      ) => {
        mockEmployeeRepository.find.mockResolvedValue(employees);
        mockOrderRepository.find.mockResolvedValue(orders);

        const result = await service.getCommissionReport({
          startDate,
          endDate,
        });

        expect(result.period).toEqual({ startDate, endDate });
        expect(result.summary).toEqual(expectedSummary);
        expect(result.employees).toHaveLength(expectedSummary.sellersCount);
        expect(
          result.employees[0].name.localeCompare(result.employees[1].name),
        ).toBeLessThanOrEqual(0);
      },
    );
  });

  describe('Exportação de relatórios em CSV', () => {
    it.each([
      [
        'regra percentual',
        CommissionType.Percentage,
        5,
        'Carlos Santos;carlos@eldo.com.br;1;1500,50;75,02;5,00%',
      ],
      [
        'valor fixo',
        CommissionType.Fixed,
        50,
        'Carlos Santos;carlos@eldo.com.br;1;1500,50;75,02;R$ 50,00',
      ],
    ])(
      'gera o CSV do relatório com BOM UTF-8 e %s',
      async (_rule, commissionType, commissionValue, expectedLine) => {
        mockEmployeeRepository.find.mockResolvedValue([
          {
            employeeId: 'emp-1',
            name: 'Carlos Santos',
            email: 'carlos@eldo.com.br',
            commissionType,
            commissionValue,
            deletedAt: null,
          },
        ]);
        mockOrderRepository.find.mockResolvedValue([
          {
            orderId: 'ord-1',
            sellerEmployeeId: 'emp-1',
            finalPrice: 1500.5,
            commission: 75.02,
            soldAt: new Date('2026-10-05T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
        ]);

        const csv = await service.exportCommissionReportCsv({
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        });

        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv.slice(1).split('\r\n')).toEqual([
          'Nome do Funcionário;E-mail;Total de Vendas;Valor Total Vendido (R$);Total de Comissão (R$);Regra de Comissão Atual',
          expectedLine,
        ]);
      },
    );

    it.each([
      ['emp-virgula', 'Vendedor, com Vírgula', '1500,50'],
      ['emp-ponto-virgula', 'Vendedor; com Ponto e Vírgula', '1500,50'],
    ])(
      'escapa adequadamente campos com delimitadores no CSV para %s (%s)',
      async (employeeId, name, priceFormatted) => {
        mockEmployeeRepository.find.mockResolvedValue([
          {
            employeeId,
            name,
            email: 'teste@eldo.com.br',
            commissionType: CommissionType.Percentage,
            commissionValue: 10,
            deletedAt: null,
          },
        ]);
        mockOrderRepository.find.mockResolvedValue([
          {
            orderId: 'ord-1',
            sellerEmployeeId: employeeId,
            finalPrice: 1500.5,
            commission: 150.05,
            soldAt: new Date('2026-10-05T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
        ]);

        const csv = await service.exportCommissionReportCsv({
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        });

        const lines = csv.replace('\uFEFF', '').split(/\r?\n/);
        const dataLine = lines[1];
        if (name.includes(';')) {
          expect(dataLine).toContain(`"${name}"`);
        }
        expect(csv).toContain(priceFormatted);
      },
    );
  });
});
