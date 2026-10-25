import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { BrasiliaPeriod, toBrasiliaPeriod } from '../common/brasilia-day';
import { PeriodQueryDto } from '../common/dto/period-query.dto';
import { OrderItem } from '../orders/entities/order-item.entity';
import {
  Order,
  OrderSource,
  SALE_STATUSES,
} from '../orders/entities/order.entity';
import { calculateConversionRate } from './conversion-rate';
import { PaintTypeRankingDto } from './dto/paint-type-ranking.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';

// A quote is born from a PDF upload or from the estimator (GLOSSARY.md).
// Contact requests are not quotes yet, and internal orders are already sales.
export const QUOTE_SOURCES = [OrderSource.Pdf, OrderSource.Estimator];
export const TOP_PAINT_TYPES_LIMIT = 5;

interface PaintTypeRankingRow {
  catalogItemId: string;
  name: string;
  orderCount: string;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async getStatistics(period: PeriodQueryDto): Promise<StatisticsResponseDto> {
    const range = toBrasiliaPeriod(period.startDate, period.endDate);

    const [quoteCount, convertedQuoteCount, topPaintTypes] = await Promise.all([
      this.countQuotes(range),
      this.countConvertedQuotes(range),
      this.findTopPaintTypes(range),
    ]);

    return {
      startDate: period.startDate,
      endDate: period.endDate,
      hasData: quoteCount > 0 || topPaintTypes.length > 0,
      quoteCount,
      convertedQuoteCount,
      conversionRate: calculateConversionRate(quoteCount, convertedQuoteCount),
      topPaintTypes,
    };
  }

  private countQuotes(range: BrasiliaPeriod): Promise<number> {
    return this.orderRepository.count({
      where: {
        source: In(QUOTE_SOURCES),
        createdAt: Between(range.start, range.end),
      },
    });
  }

  // Counts the period's quotes that reached a sale, even if the sale itself
  // happened after the period: the rate measures how those quotes ended up.
  private countConvertedQuotes(range: BrasiliaPeriod): Promise<number> {
    return this.orderRepository.count({
      where: {
        source: In(QUOTE_SOURCES),
        createdAt: Between(range.start, range.end),
        status: In(SALE_STATUSES),
      },
    });
  }

  // Ranks paint types by how many of the period's orders asked for them, of
  // any source and status: unlike the quote counts, it measures the demand
  // for each paint. An order with several pieces of the same paint counts once.
  private async findTopPaintTypes(
    range: BrasiliaPeriod,
  ): Promise<PaintTypeRankingDto[]> {
    const rows = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      // A paint type the company stopped offering still counts for the
      // orders that asked for it. TypeORM adds the deleted_at filter when the
      // join is declared, so withDeleted must come before the joins.
      .withDeleted()
      .innerJoin('orderItem.order', 'order')
      .innerJoin('orderItem.paintCatalogItem', 'paintType')
      .select('paintType.catalogItemId', 'catalogItemId')
      .addSelect('paintType.name', 'name')
      .addSelect('COUNT(DISTINCT order.orderId)', 'orderCount')
      .where('order.createdAt BETWEEN :start AND :end', range)
      .groupBy('paintType.catalogItemId')
      .addGroupBy('paintType.name')
      .orderBy('"orderCount"', 'DESC')
      .addOrderBy('paintType.name', 'ASC')
      .limit(TOP_PAINT_TYPES_LIMIT)
      .getRawMany<PaintTypeRankingRow>();

    return rows.map((row) => ({
      catalogItemId: row.catalogItemId,
      name: row.name,
      orderCount: Number(row.orderCount),
    }));
  }
}
