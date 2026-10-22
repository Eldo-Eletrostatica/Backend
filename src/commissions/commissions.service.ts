import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';
import { Order, SALE_STATUSES } from '../orders/entities/order.entity';
import { endOfBrasiliaDay, startOfBrasiliaDay } from './brasilia-day';
import { AccumulatedCommissionsResponseDto } from './dto/accumulated-commissions-response.dto';
import { CommissionReportResponseDto } from './dto/commission-report-response.dto';
import { GetCommissionsQueryDto } from './dto/get-commissions-query.dto';
import {
  GetSalesRankingQueryDto,
  SalesRankingOrderBy,
} from './dto/get-sales-ranking-query.dto';
import { SalesRankingResponseDto } from './dto/sales-ranking-response.dto';

const CENTS_PER_REAL = 100;

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (
    str.includes(';') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function formatCommissionType(type: CommissionType | null): string {
  if (type === CommissionType.Percentage) {
    return 'Percentual';
  }
  if (type === CommissionType.Fixed) {
    return 'Fixo';
  }
  return '-';
}

function formatCommissionRule(
  type: CommissionType | null,
  value: number | null,
): string {
  if (value === null || type === null) {
    return '-';
  }
  if (type === CommissionType.Percentage) {
    return `${formatMoney(value)}%`;
  }
  return `R$ ${formatMoney(value)}`;
}

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getAccumulatedCommissions(
    employeeId: string,
    query: GetCommissionsQueryDto,
  ): Promise<AccumulatedCommissionsResponseDto> {
    const { startDate, endDate } = query;

    const startDateTime = startOfBrasiliaDay(startDate);
    const endDateTime = endOfBrasiliaDay(endDate);

    if (startDateTime > endDateTime) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final.',
      );
    }
    const employee = await this.employeeRepository.findOne({
      where: { employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Vendedor não encontrado.');
    }

    const orders = await this.orderRepository.find({
      where: {
        sellerEmployeeId: employeeId,
        status: In(SALE_STATUSES),
        soldAt: Between(startDateTime, endDateTime),
      },
      order: {
        soldAt: 'ASC',
      },
    });

    let totalCommissionCents = 0;
    let totalSalesValueCents = 0;

    const sales = orders.map((order) => {
      const commission = order.commission ?? 0;
      const finalPrice = order.finalPrice ?? 0;

      totalCommissionCents += Math.round(commission * CENTS_PER_REAL);
      totalSalesValueCents += Math.round(finalPrice * CENTS_PER_REAL);

      return {
        orderId: order.orderId,
        trackingCode: order.trackingCode ?? '',
        soldAt: order.soldAt!,
        finalPrice,
        commission,
        status: order.status,
      };
    });

    return {
      employeeId,
      startDate,
      endDate,
      totalCommission: totalCommissionCents / CENTS_PER_REAL,
      totalSalesValue: totalSalesValueCents / CENTS_PER_REAL,
      salesCount: orders.length,
      sales,
    };
  }

  async getCommissionReport(
    query: GetCommissionsQueryDto,
  ): Promise<CommissionReportResponseDto> {
    const { startDate, endDate } = query;

    const startDateTime = startOfBrasiliaDay(startDate);
    const endDateTime = endOfBrasiliaDay(endDate);

    if (startDateTime > endDateTime) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final.',
      );
    }

    const orders = await this.orderRepository.find({
      where: {
        status: In(SALE_STATUSES),
        soldAt: Between(startDateTime, endDateTime),
      },
      order: {
        soldAt: 'ASC',
      },
    });

    const ordersBySeller = new Map<string, Order[]>();
    for (const order of orders) {
      if (order.sellerEmployeeId) {
        const sellerOrders = ordersBySeller.get(order.sellerEmployeeId) ?? [];
        sellerOrders.push(order);
        ordersBySeller.set(order.sellerEmployeeId, sellerOrders);
      }
    }

    const allEmployees = await this.employeeRepository.find({
      withDeleted: true,
    });

    const eligibleEmployees = allEmployees.filter(
      (emp) =>
        (!emp.deletedAt && emp.commissionType !== null) ||
        ordersBySeller.has(emp.employeeId),
    );

    let globalCommissionCents = 0;
    let globalSalesValueCents = 0;
    let globalSalesCount = 0;

    const reportEmployees = eligibleEmployees.map((emp) => {
      const sellerOrders = ordersBySeller.get(emp.employeeId) ?? [];
      let empCommissionCents = 0;
      let empSalesValueCents = 0;

      for (const order of sellerOrders) {
        empCommissionCents += Math.round(
          (order.commission ?? 0) * CENTS_PER_REAL,
        );
        empSalesValueCents += Math.round(
          (order.finalPrice ?? 0) * CENTS_PER_REAL,
        );
      }

      globalCommissionCents += empCommissionCents;
      globalSalesValueCents += empSalesValueCents;
      globalSalesCount += sellerOrders.length;

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        salesCount: sellerOrders.length,
        totalSalesValue: empSalesValueCents / CENTS_PER_REAL,
        totalCommission: empCommissionCents / CENTS_PER_REAL,
        commissionType: emp.commissionType,
        commissionValue: emp.commissionValue,
        isDeleted: emp.deletedAt !== null,
      };
    });

    reportEmployees.sort((a, b) => a.name.localeCompare(b.name));

    return {
      period: { startDate, endDate },
      summary: {
        totalCommission: globalCommissionCents / CENTS_PER_REAL,
        totalSalesValue: globalSalesValueCents / CENTS_PER_REAL,
        totalSalesCount: globalSalesCount,
        sellersCount: reportEmployees.length,
      },
      employees: reportEmployees,
    };
  }

  async getSalesRanking(
    query: GetSalesRankingQueryDto,
  ): Promise<SalesRankingResponseDto> {
    const { startDate, endDate } = query;
    const orderBy = query.orderBy ?? SalesRankingOrderBy.Value;

    const startDateTime = startOfBrasiliaDay(startDate);
    const endDateTime = endOfBrasiliaDay(endDate);

    if (startDateTime > endDateTime) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final.',
      );
    }

    const orders = await this.orderRepository.find({
      where: {
        status: In(SALE_STATUSES),
        soldAt: Between(startDateTime, endDateTime),
      },
      order: {
        soldAt: 'ASC',
      },
    });

    const ordersBySeller = new Map<string, Order[]>();
    for (const order of orders) {
      if (order.sellerEmployeeId) {
        const sellerOrders = ordersBySeller.get(order.sellerEmployeeId) ?? [];
        sellerOrders.push(order);
        ordersBySeller.set(order.sellerEmployeeId, sellerOrders);
      }
    }

    if (ordersBySeller.size === 0) {
      return {
        period: { startDate, endDate, orderBy },
        ranking: [],
      };
    }

    const allEmployees = await this.employeeRepository.find({
      withDeleted: true,
    });
    const employeesById = new Map<string, Employee>();
    for (const emp of allEmployees) {
      employeesById.set(emp.employeeId, emp);
    }

    const items: Array<{
      employeeId: string;
      name: string;
      email: string;
      salesCount: number;
      totalSalesValue: number;
      averageTicket: number;
    }> = [];

    for (const [sellerId, sellerOrders] of ordersBySeller.entries()) {
      const emp = employeesById.get(sellerId);
      if (!emp) continue;

      let salesValueCents = 0;
      for (const order of sellerOrders) {
        salesValueCents += Math.round((order.finalPrice ?? 0) * CENTS_PER_REAL);
      }

      const totalSalesValue = salesValueCents / CENTS_PER_REAL;
      const salesCount = sellerOrders.length;
      const averageTicket =
        salesCount > 0
          ? Math.round((totalSalesValue / salesCount) * CENTS_PER_REAL) /
            CENTS_PER_REAL
          : 0;

      items.push({
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        salesCount,
        totalSalesValue,
        averageTicket,
      });
    }

    items.sort((a, b) => {
      if (orderBy === SalesRankingOrderBy.Volume) {
        if (b.salesCount !== a.salesCount) {
          return b.salesCount - a.salesCount;
        }
        if (b.totalSalesValue !== a.totalSalesValue) {
          return b.totalSalesValue - a.totalSalesValue;
        }
        return a.name.localeCompare(b.name);
      }

      if (b.totalSalesValue !== a.totalSalesValue) {
        return b.totalSalesValue - a.totalSalesValue;
      }
      if (b.salesCount !== a.salesCount) {
        return b.salesCount - a.salesCount;
      }
      return a.name.localeCompare(b.name);
    });

    const ranking = items.map((item, index) => ({
      position: index + 1,
      ...item,
    }));

    return {
      period: { startDate, endDate, orderBy },
      ranking,
    };
  }

  async exportCommissionReportCsv(
    query: GetCommissionsQueryDto,
  ): Promise<string> {
    const report = await this.getCommissionReport(query);

    const headers = [
      'Nome do Funcionário',
      'E-mail',
      'Total de Vendas',
      'Valor Total Vendido (R$)',
      'Total de Comissão (R$)',
      'Tipo de Comissão',
      'Regra de Comissão',
    ];

    const rows = report.employees.map((emp) => [
      escapeCsv(emp.name),
      escapeCsv(emp.email),
      escapeCsv(emp.salesCount),
      escapeCsv(formatMoney(emp.totalSalesValue)),
      escapeCsv(formatMoney(emp.totalCommission)),
      escapeCsv(formatCommissionType(emp.commissionType)),
      escapeCsv(formatCommissionRule(emp.commissionType, emp.commissionValue)),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.join(';')),
    ].join('\r\n');
    return `\uFEFF${csvContent}`;
  }

  async exportSalesRankingCsv(query: GetSalesRankingQueryDto): Promise<string> {
    const rankingResponse = await this.getSalesRanking(query);

    const headers = [
      'Posição',
      'Nome do Funcionário',
      'E-mail',
      'Quantidade de Vendas',
      'Valor Total Vendido (R$)',
      'Ticket Médio (R$)',
    ];

    const rows = rankingResponse.ranking.map((item) => [
      escapeCsv(item.position),
      escapeCsv(item.name),
      escapeCsv(item.email),
      escapeCsv(item.salesCount),
      escapeCsv(formatMoney(item.totalSalesValue)),
      escapeCsv(formatMoney(item.averageTicket)),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.join(';')),
    ].join('\r\n');
    return `\uFEFF${csvContent}`;
  }
}
