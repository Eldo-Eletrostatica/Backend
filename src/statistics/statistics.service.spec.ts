import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, In } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order, SALE_STATUSES } from '../orders/entities/order.entity';
import { QUOTE_SOURCES, StatisticsService } from './statistics.service';

const OCTOBER = { startDate: '2026-10-01', endDate: '2026-10-31' };
// October 2026 in Brasília time (UTC-3), as toBrasiliaPeriod builds it.
const OCTOBER_START = new Date('2026-10-01T03:00:00.000Z');
const OCTOBER_END = new Date('2026-11-01T02:59:59.999Z');

describe('StatisticsService', () => {
  let service: StatisticsService;
  let countOrders: jest.Mock;
  let getRawMany: jest.Mock;
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    countOrders = jest.fn();
    getRawMany = jest.fn().mockResolvedValue([]);

    // Every builder step returns the builder itself, like TypeORM does.
    queryBuilder = { getRawMany };
    for (const step of [
      'innerJoin',
      'withDeleted',
      'select',
      'addSelect',
      'where',
      'groupBy',
      'addGroupBy',
      'orderBy',
      'addOrderBy',
      'limit',
    ]) {
      queryBuilder[step] = jest.fn().mockReturnValue(queryBuilder);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: getRepositoryToken(Order),
          useValue: { count: countOrders },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: { createQueryBuilder: () => queryBuilder },
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  function mockQuoteCounts(quoteCount: number, convertedQuoteCount: number) {
    countOrders
      .mockResolvedValueOnce(quoteCount)
      .mockResolvedValueOnce(convertedQuoteCount);
  }

  it('junta os indicadores do período numa resposta', async () => {
    mockQuoteCounts(42, 13);
    getRawMany.mockResolvedValue([
      { catalogItemId: 'epoxy-id', name: 'Epóxi', orderCount: '15' },
      { catalogItemId: 'polyester-id', name: 'Poliéster', orderCount: '9' },
    ]);

    const statistics = await service.getStatistics(OCTOBER);

    expect(statistics).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      hasData: true,
      quoteCount: 42,
      convertedQuoteCount: 13,
      conversionRate: 0.3095,
      topPaintTypes: [
        { catalogItemId: 'epoxy-id', name: 'Epóxi', orderCount: 15 },
        { catalogItemId: 'polyester-id', name: 'Poliéster', orderCount: 9 },
      ],
    });
  });

  it('conta os orçamentos e as vendas só entre os orçamentos do período', async () => {
    mockQuoteCounts(42, 13);

    await service.getStatistics(OCTOBER);

    const quotesInPeriod = {
      source: In(QUOTE_SOURCES),
      createdAt: Between(OCTOBER_START, OCTOBER_END),
    };
    expect(countOrders).toHaveBeenNthCalledWith(1, { where: quotesInPeriod });
    expect(countOrders).toHaveBeenNthCalledWith(2, {
      where: { ...quotesInPeriod, status: In(SALE_STATUSES) },
    });
  });

  it('monta o ranking com os pedidos criados no período', async () => {
    mockQuoteCounts(0, 0);

    await service.getStatistics(OCTOBER);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'order.createdAt BETWEEN :start AND :end',
      { start: OCTOBER_START, end: OCTOBER_END },
    );
  });

  it.each([
    [0, [], false],
    [3, [], true],
    [0, [{ catalogItemId: 'epoxy-id', name: 'Epóxi', orderCount: '1' }], true],
  ])(
    'com %i orçamentos e ranking %j, hasData é %s',
    async (quoteCount, paintTypeRows, expectedHasData) => {
      mockQuoteCounts(quoteCount, 0);
      getRawMany.mockResolvedValue(paintTypeRows);

      const statistics = await service.getStatistics(OCTOBER);

      expect(statistics.hasData).toBe(expectedHasData);
    },
  );

  it.each([
    ['2026-10-31', '2026-10-01'],
    ['2026-12-01', '2026-11-30'],
  ])(
    'rejeita o período de %s a %s, com a data inicial depois da final',
    async (startDate, endDate) => {
      await expect(
        service.getStatistics({ startDate, endDate }),
      ).rejects.toThrow(
        new BadRequestException(
          'A data inicial não pode ser posterior à data final.',
        ),
      );
      expect(countOrders).not.toHaveBeenCalled();
    },
  );
});
