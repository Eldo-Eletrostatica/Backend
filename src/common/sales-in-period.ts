import { Between, In, Repository } from 'typeorm';
import { Order, SALE_STATUSES } from '../orders/entities/order.entity';
import { BrasiliaPeriod } from './brasilia-day';

const CENTS_PER_REAL = 100;

export interface SalesTotals {
  salesCount: number;
  totalSalesValue: number;
  totalCommission: number;
}

// Sales launched in the period, oldest first, optionally of a single seller.
export function findSalesInPeriod(
  orders: Repository<Order>,
  period: BrasiliaPeriod,
  sellerEmployeeId?: string,
): Promise<Order[]> {
  return orders.find({
    where: {
      ...(sellerEmployeeId === undefined ? {} : { sellerEmployeeId }),
      status: In(SALE_STATUSES),
      soldAt: Between(period.start, period.end),
    },
    order: { soldAt: 'ASC' },
  });
}

export function groupSalesBySeller(sales: Order[]): Map<string, Order[]> {
  const salesBySeller = new Map<string, Order[]>();
  for (const sale of sales) {
    if (sale.sellerEmployeeId !== null) {
      const sellerSales = salesBySeller.get(sale.sellerEmployeeId) ?? [];
      sellerSales.push(sale);
      salesBySeller.set(sale.sellerEmployeeId, sellerSales);
    }
  }
  return salesBySeller;
}

// Sums in cents so that adding many prices does not accumulate float errors.
export function sumSales(sales: Order[]): SalesTotals {
  let salesValueCents = 0;
  let commissionCents = 0;
  for (const sale of sales) {
    salesValueCents += Math.round((sale.finalPrice ?? 0) * CENTS_PER_REAL);
    commissionCents += Math.round((sale.commission ?? 0) * CENTS_PER_REAL);
  }
  return {
    salesCount: sales.length,
    totalSalesValue: salesValueCents / CENTS_PER_REAL,
    totalCommission: commissionCents / CENTS_PER_REAL,
  };
}
