import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toBrasiliaPeriod } from '../common/brasilia-day';
import { formatMoney, toCsv } from '../common/csv';
import { PeriodQueryDto } from '../common/dto/period-query.dto';
import {
  findSalesInPeriod,
  groupSalesBySeller,
  sumSales,
} from '../common/sales-in-period';
import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';
import { Order } from '../orders/entities/order.entity';
import { AccumulatedCommissionsResponseDto } from './dto/accumulated-commissions-response.dto';
import {
  CommissionReportEmployeeDto,
  CommissionReportResponseDto,
} from './dto/commission-report-response.dto';

const COMMISSION_REPORT_HEADERS = [
  'Nome do Funcionário',
  'E-mail',
  'Total de Vendas',
  'Valor Total Vendido (R$)',
  'Total de Comissão (R$)',
  'Regra de Comissão Atual',
];

// The current rule, not the one used by each sale: the commission of a sale
// is frozen at launch (ADR 0003).
function formatCurrentCommissionRule(employee: CommissionReportEmployeeDto) {
  const { commissionType, commissionValue } = employee;
  if (commissionType === null || commissionValue === null) {
    return '-';
  }
  return commissionType === CommissionType.Percentage
    ? `${formatMoney(commissionValue)}%`
    : `R$ ${formatMoney(commissionValue)}`;
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
    query: PeriodQueryDto,
  ): Promise<AccumulatedCommissionsResponseDto> {
    const { startDate, endDate } = query;
    const period = toBrasiliaPeriod(startDate, endDate);

    const employee = await this.employeeRepository.findOne({
      where: { employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Vendedor não encontrado.');
    }

    const orders = await findSalesInPeriod(
      this.orderRepository,
      period,
      employeeId,
    );
    const { salesCount, totalSalesValue, totalCommission } = sumSales(orders);

    return {
      employeeId,
      startDate,
      endDate,
      totalCommission,
      totalSalesValue,
      salesCount,
      sales: orders.map((order) => ({
        orderId: order.orderId,
        trackingCode: order.trackingCode ?? '',
        soldAt: order.soldAt!,
        finalPrice: order.finalPrice ?? 0,
        commission: order.commission ?? 0,
        status: order.status,
      })),
    };
  }

  // Lists every active employee with a commission rule, even without sales,
  // plus removed employees who still sold in the period.
  async getCommissionReport(
    query: PeriodQueryDto,
  ): Promise<CommissionReportResponseDto> {
    const { startDate, endDate } = query;
    const period = toBrasiliaPeriod(startDate, endDate);

    const sales = await findSalesInPeriod(this.orderRepository, period);
    const salesBySeller = groupSalesBySeller(sales);
    const allEmployees = await this.employeeRepository.find({
      withDeleted: true,
    });

    const employees = allEmployees
      .filter(
        (employee) =>
          (employee.deletedAt === null && employee.commissionType !== null) ||
          salesBySeller.has(employee.employeeId),
      )
      .map((employee) => ({
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        ...sumSales(salesBySeller.get(employee.employeeId) ?? []),
        commissionType: employee.commissionType,
        commissionValue: employee.commissionValue,
        isDeleted: employee.deletedAt !== null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const totals = sumSales(sales);
    return {
      period: { startDate, endDate },
      summary: {
        totalCommission: totals.totalCommission,
        totalSalesValue: totals.totalSalesValue,
        totalSalesCount: totals.salesCount,
        sellersCount: employees.length,
      },
      employees,
    };
  }

  async exportCommissionReportCsv(query: PeriodQueryDto): Promise<string> {
    const report = await this.getCommissionReport(query);
    return toCsv(
      COMMISSION_REPORT_HEADERS,
      report.employees.map((employee) => [
        employee.name,
        employee.email,
        employee.salesCount,
        formatMoney(employee.totalSalesValue),
        formatMoney(employee.totalCommission),
        formatCurrentCommissionRule(employee),
      ]),
    );
  }
}
