import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { SalesRankingOrderBy } from './dto/get-sales-ranking-query.dto';
import { SalesRankingsService } from './sales-rankings.service';

describe('SalesRankingsService', () => {
  let service: SalesRankingsService;
  let mockEmployeeRepository: { find: jest.Mock };
  let mockOrderRepository: { find: jest.Mock };

  beforeEach(async () => {
    mockEmployeeRepository = { find: jest.fn() };
    mockOrderRepository = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesRankingsService,
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

    service = module.get<SalesRankingsService>(SalesRankingsService);
  });

  describe('Ranking de vendas (getSalesRanking)', () => {
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
        await expect(
          service.getSalesRanking({
            startDate,
            endDate,
            orderBy: SalesRankingOrderBy.Value,
          }),
        ).rejects.toThrow(new BadRequestException(expectedMessage));
      },
    );

    it.each([
      [
        'ordenação por valor (padrão) com desempate por volume',
        SalesRankingOrderBy.Value,
        [
          {
            employeeId: 'emp-1',
            name: 'Carlos Santos',
            email: 'carlos@eldo.com.br',
            deletedAt: null,
          },
          {
            employeeId: 'emp-2',
            name: 'Ana Ribeiro',
            email: 'ana@eldo.com.br',
            deletedAt: null,
          },
          {
            employeeId: 'emp-3',
            name: 'Bruna Lima',
            email: 'bruna@eldo.com.br',
            deletedAt: null,
          },
        ],
        [
          {
            orderId: 'ord-1',
            sellerEmployeeId: 'emp-1',
            finalPrice: 1000,
            soldAt: new Date('2026-10-05T10:00:00.000Z'),
            status: OrderStatus.Queued,
          },
          {
            orderId: 'ord-2',
            sellerEmployeeId: 'emp-1',
            finalPrice: 2000,
            soldAt: new Date('2026-10-06T10:00:00.000Z'),
            status: OrderStatus.Queued,
          },
          {
            orderId: 'ord-3',
            sellerEmployeeId: 'emp-2',
            finalPrice: 1000,
            soldAt: new Date('2026-10-07T10:00:00.000Z'),
            status: OrderStatus.InProduction,
          },
          {
            orderId: 'ord-4',
            sellerEmployeeId: 'emp-2',
            finalPrice: 1000,
            soldAt: new Date('2026-10-08T10:00:00.000Z'),
            status: OrderStatus.InProduction,
          },
          {
            orderId: 'ord-5',
            sellerEmployeeId: 'emp-2',
            finalPrice: 1000,
            soldAt: new Date('2026-10-09T10:00:00.000Z'),
            status: OrderStatus.InProduction,
          },
          {
            orderId: 'ord-6',
            sellerEmployeeId: 'emp-3',
            finalPrice: 5000,
            soldAt: new Date('2026-10-10T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
        ],
        ['emp-3', 'emp-2', 'emp-1'],
      ],
      [
        'ordenação por volume com desempate por valor',
        SalesRankingOrderBy.Volume,
        [
          {
            employeeId: 'emp-1',
            name: 'Carlos Santos',
            email: 'carlos@eldo.com.br',
            deletedAt: null,
          },
          {
            employeeId: 'emp-2',
            name: 'Ana Ribeiro',
            email: 'ana@eldo.com.br',
            deletedAt: null,
          },
          {
            employeeId: 'emp-3',
            name: 'Bruna Lima',
            email: 'bruna@eldo.com.br',
            deletedAt: null,
          },
        ],
        [
          {
            orderId: 'ord-1',
            sellerEmployeeId: 'emp-1',
            finalPrice: 2000,
            soldAt: new Date('2026-10-05T10:00:00.000Z'),
            status: OrderStatus.Queued,
          },
          {
            orderId: 'ord-2',
            sellerEmployeeId: 'emp-1',
            finalPrice: 2000,
            soldAt: new Date('2026-10-06T10:00:00.000Z'),
            status: OrderStatus.Queued,
          },
          {
            orderId: 'ord-3',
            sellerEmployeeId: 'emp-2',
            finalPrice: 3000,
            soldAt: new Date('2026-10-07T10:00:00.000Z'),
            status: OrderStatus.InProduction,
          },
          {
            orderId: 'ord-4',
            sellerEmployeeId: 'emp-2',
            finalPrice: 2000,
            soldAt: new Date('2026-10-08T10:00:00.000Z'),
            status: OrderStatus.InProduction,
          },
          {
            orderId: 'ord-5',
            sellerEmployeeId: 'emp-3',
            finalPrice: 200,
            soldAt: new Date('2026-10-09T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
          {
            orderId: 'ord-6',
            sellerEmployeeId: 'emp-3',
            finalPrice: 200,
            soldAt: new Date('2026-10-10T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
          {
            orderId: 'ord-7',
            sellerEmployeeId: 'emp-3',
            finalPrice: 200,
            soldAt: new Date('2026-10-11T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
          {
            orderId: 'ord-8',
            sellerEmployeeId: 'emp-3',
            finalPrice: 200,
            soldAt: new Date('2026-10-12T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
          {
            orderId: 'ord-9',
            sellerEmployeeId: 'emp-3',
            finalPrice: 200,
            soldAt: new Date('2026-10-13T10:00:00.000Z'),
            status: OrderStatus.Completed,
          },
        ],
        ['emp-3', 'emp-2', 'emp-1'],
      ],
    ])(
      'calcula ranking com %s',
      async (_scenario, orderBy, employees, orders, expectedEmployeeIds) => {
        mockEmployeeRepository.find.mockResolvedValue(employees);
        mockOrderRepository.find.mockResolvedValue(orders);

        const result = await service.getSalesRanking({
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          orderBy,
        });

        expect(result.ranking).toHaveLength(expectedEmployeeIds.length);
        expect(result.ranking.map((r) => r.employeeId)).toEqual(
          expectedEmployeeIds,
        );
        expect(result.ranking[0].position).toBe(1);
        expect(result.ranking[1].position).toBe(2);
        expect(result.ranking[2].position).toBe(3);
        expect(result.ranking[0].averageTicket).toBeGreaterThan(0);
      },
    );
  });

  describe('Exportação do ranking em CSV', () => {
    it.each([
      [
        SalesRankingOrderBy.Value,
        '1;Carlos Santos;carlos@eldo.com.br;1;1500,50;1500,50',
      ],
      [
        SalesRankingOrderBy.Volume,
        '1;Carlos Santos;carlos@eldo.com.br;1;1500,50;1500,50',
      ],
    ])(
      'gera o CSV do ranking por %s com BOM UTF-8',
      async (orderBy, expectedLine) => {
        mockEmployeeRepository.find.mockResolvedValue([
          {
            employeeId: 'emp-1',
            name: 'Carlos Santos',
            email: 'carlos@eldo.com.br',
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

        const csv = await service.exportSalesRankingCsv({
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          orderBy,
        });

        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv.slice(1).split('\r\n')).toEqual([
          'Posição;Nome do Funcionário;E-mail;Quantidade de Vendas;Valor Total Vendido (R$);Ticket Médio (R$)',
          expectedLine,
        ]);
      },
    );
  });
});
