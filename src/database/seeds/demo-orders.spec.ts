import { OrderSource } from '../../orders/entities/order.entity';
import { buildDemoOrders } from './demo-orders';

// Day as the dashboard sees it, in Brasília (UTC-3).
function brasiliaDay(date: Date): string {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

describe('buildDemoOrders', () => {
  it.each([
    ['2026-11-09T15:00:00Z', '2026-11-01', '2026-11-09'],
    ['2026-03-02T15:00:00Z', '2026-03-01', '2026-03-02'],
    ['2026-01-01T12:00:00Z', '2026-01-01', '2026-01-01'],
  ])(
    'em %s, os 7 pedidos do mês ficam entre %s e %s',
    (now, firstDayOfMonth, today) => {
      const currentMonthOrders = buildDemoOrders(new Date(now)).slice(0, 7);

      for (const order of currentMonthOrders) {
        expect(brasiliaDay(order.createdAt) >= firstDayOfMonth).toBe(true);
        expect(brasiliaDay(order.createdAt) <= today).toBe(true);
      }
    },
  );

  it.each([
    ['2026-11-09T15:00:00Z', '2026-06-01'],
    ['2026-01-20T15:00:00Z', '2025-08-01'],
  ])(
    'em %s, os pedidos dos meses anteriores começam em %s ou depois',
    (now, firstDayOfSixMonths) => {
      const olderOrders = buildDemoOrders(new Date(now)).slice(7);

      expect(olderOrders).toHaveLength(8);
      for (const order of olderOrders) {
        expect(brasiliaDay(order.createdAt) >= firstDayOfSixMonths).toBe(true);
      }
    },
  );

  it.each([
    [OrderSource.Estimator, 9],
    [OrderSource.Pdf, 5],
    [OrderSource.Internal, 1],
  ])('cria %s em %i pedidos', (source, expectedCount) => {
    const orders = buildDemoOrders(new Date('2026-11-09T15:00:00Z'));

    expect(orders.filter((order) => order.source === source)).toHaveLength(
      expectedCount,
    );
  });
});
