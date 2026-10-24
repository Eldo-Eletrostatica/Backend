import { Order } from '../orders/entities/order.entity';
import { groupSalesBySeller, sumSales } from './sales-in-period';

const sale = (
  sellerEmployeeId: string | null,
  finalPrice: number,
  commission: number,
): Order => ({ sellerEmployeeId, finalPrice, commission }) as Order;

describe('sumSales', () => {
  it.each([
    [[], 0, 0, 0],
    [[sale('a', 1000, 50), sale('a', 2000.5, 100.25)], 2, 3000.5, 150.25],
    [[sale('a', 0.1, 0.01), sale('a', 0.2, 0.02)], 2, 0.3, 0.03],
  ])(
    'soma %p em %p vendas, R$ %p vendidos e R$ %p de comissão',
    (sales, salesCount, totalSalesValue, totalCommission) => {
      expect(sumSales(sales)).toEqual({
        salesCount,
        totalSalesValue,
        totalCommission,
      });
    },
  );
});

describe('groupSalesBySeller', () => {
  it.each([
    [[sale('a', 1, 0), sale('b', 2, 0), sale('a', 3, 0)], { a: 2, b: 1 }],
    [[sale(null, 1, 0), sale('b', 2, 0)], { b: 1 }],
  ])('agrupa %p por vendedor como %p', (sales, expectedCounts) => {
    const counts = Object.fromEntries(
      [...groupSalesBySeller(sales)].map(([seller, sellerSales]) => [
        seller,
        sellerSales.length,
      ]),
    );
    expect(counts).toEqual(expectedCounts);
  });
});
