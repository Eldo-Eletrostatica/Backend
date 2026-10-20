import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Order, SALE_STATUSES } from '../orders/entities/order.entity';
import { AccumulatedCommissionsResponseDto } from './dto/accumulated-commissions-response.dto';
import { GetCommissionsQueryDto } from './dto/get-commissions-query.dto';

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const CENTS_PER_REAL = 100;
// Brazil has had no daylight saving time since 2019, so Brasília is always
// UTC-3.
const BRASILIA_UTC_OFFSET = '-03:00';

export function parseBrasiliaDate(dateStr: string, isEndOfDay: boolean): Date {
  const match = DATE_REGEX.exec(dateStr);
  if (!match) {
    throw new BadRequestException(
      `Formato de data inválido: ${dateStr}. Use YYYY-MM-DD.`,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const testDate = new Date(Date.UTC(year, month - 1, day));
  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    throw new BadRequestException(
      `Data de calendário inexistente: ${dateStr}.`,
    );
  }

  const time = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
  return new Date(`${dateStr}T${time}${BRASILIA_UTC_OFFSET}`);
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

    const startDateTime = parseBrasiliaDate(startDate, false);
    const endDateTime = parseBrasiliaDate(endDate, true);

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
}
