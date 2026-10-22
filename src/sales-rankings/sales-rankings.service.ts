import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { toBrasiliaPeriod } from '../common/brasilia-day';
import { formatMoney, toCsv } from '../common/csv';
import {
  findSalesInPeriod,
  groupSalesBySeller,
  sumSales,
} from '../common/sales-in-period';
import { Employee } from '../employees/entities/employee.entity';
import { Order } from '../orders/entities/order.entity';
import {
  GetSalesRankingQueryDto,
  SalesRankingOrderBy,
} from './dto/get-sales-ranking-query.dto';
import {
  SalesRankingItemDto,
  SalesRankingResponseDto,
} from './dto/sales-ranking-response.dto';

const CENTS_PER_REAL = 100;

const SALES_RANKING_HEADERS = [
  'Posição',
  'Nome do Funcionário',
  'E-mail',
  'Quantidade de Vendas',
  'Valor Total Vendido (R$)',
  'Ticket Médio (R$)',
];

type RankedSeller = Omit<SalesRankingItemDto, 'position'>;

// Ties on the chosen criterion fall back to the other one, then to the name.
function compareSellers(orderBy: SalesRankingOrderBy) {
  return (a: RankedSeller, b: RankedSeller): number => {
    const byValue = b.totalSalesValue - a.totalSalesValue;
    const byVolume = b.salesCount - a.salesCount;
    const [first, second] =
      orderBy === SalesRankingOrderBy.Volume
        ? [byVolume, byValue]
        : [byValue, byVolume];
    return first || second || a.name.localeCompare(b.name);
  };
}

@Injectable()
export class SalesRankingsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getSalesRanking(
    query: GetSalesRankingQueryDto,
  ): Promise<SalesRankingResponseDto> {
    const { startDate, endDate } = query;
    const orderBy = query.orderBy ?? SalesRankingOrderBy.Value;
    const period = toBrasiliaPeriod(startDate, endDate);

    const salesBySeller = groupSalesBySeller(
      await findSalesInPeriod(this.orderRepository, period),
    );
    if (salesBySeller.size === 0) {
      return { period: { startDate, endDate, orderBy }, ranking: [] };
    }
    // Removed employees keep their place in the ranking of past periods.
    const sellers = await this.employeeRepository.find({
      where: { employeeId: In([...salesBySeller.keys()]) },
      withDeleted: true,
    });

    const ranking = sellers
      .filter((seller) => salesBySeller.has(seller.employeeId))
      .map((seller) => {
        const { salesCount, totalSalesValue } = sumSales(
          salesBySeller.get(seller.employeeId)!,
        );
        return {
          employeeId: seller.employeeId,
          name: seller.name,
          email: seller.email,
          salesCount,
          totalSalesValue,
          averageTicket:
            Math.round((totalSalesValue / salesCount) * CENTS_PER_REAL) /
            CENTS_PER_REAL,
        };
      })
      .sort(compareSellers(orderBy))
      .map((seller, index) => ({ position: index + 1, ...seller }));

    return { period: { startDate, endDate, orderBy }, ranking };
  }

  async exportSalesRankingCsv(query: GetSalesRankingQueryDto): Promise<string> {
    const { ranking } = await this.getSalesRanking(query);
    return toCsv(
      SALES_RANKING_HEADERS,
      ranking.map((seller) => [
        seller.position,
        seller.name,
        seller.email,
        seller.salesCount,
        formatMoney(seller.totalSalesValue),
        formatMoney(seller.averageTicket),
      ]),
    );
  }
}
