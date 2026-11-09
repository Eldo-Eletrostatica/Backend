import { startOfBrasiliaDay, todayInBrasilia } from '../../common/brasilia-day';
import { OrderSource } from '../../orders/entities/order.entity';

export type DemoPaintKey = 'epoxy' | 'polyester' | 'textured' | 'primer';

export interface DemoOrder {
  createdAt: Date;
  source: OrderSource;
  isSold: boolean;
  paintKey: DemoPaintKey;
}

interface DemoOrderPlan {
  // 0 is the current month.
  monthsBack: number;
  // For the current month, days before today; for the others, the day.
  day: number;
  source: OrderSource;
  isSold: boolean;
  paintKey: DemoPaintKey;
}

// 10:00 in Brasília, a working hour.
const DEMO_HOUR_MS = 10 * 60 * 60 * 1000;

// Seven orders in the current month and eight in the five months before, so
// "Este mês", "Últimos 6 meses" and "Este ano" of the dashboard differ.
const DEMO_ORDER_PLANS: DemoOrderPlan[] = [
  {
    monthsBack: 0,
    day: 6,
    source: OrderSource.Estimator,
    isSold: true,
    paintKey: 'epoxy',
  },
  {
    monthsBack: 0,
    day: 5,
    source: OrderSource.Pdf,
    isSold: false,
    paintKey: 'epoxy',
  },
  {
    monthsBack: 0,
    day: 4,
    source: OrderSource.Estimator,
    isSold: true,
    paintKey: 'polyester',
  },
  {
    monthsBack: 0,
    day: 3,
    source: OrderSource.Estimator,
    isSold: false,
    paintKey: 'textured',
  },
  {
    monthsBack: 0,
    day: 2,
    source: OrderSource.Pdf,
    isSold: false,
    paintKey: 'epoxy',
  },
  {
    monthsBack: 0,
    day: 1,
    source: OrderSource.Estimator,
    isSold: false,
    paintKey: 'primer',
  },
  {
    monthsBack: 0,
    day: 0,
    source: OrderSource.Internal,
    isSold: true,
    paintKey: 'textured',
  },
  {
    monthsBack: 1,
    day: 6,
    source: OrderSource.Estimator,
    isSold: true,
    paintKey: 'polyester',
  },
  {
    monthsBack: 1,
    day: 14,
    source: OrderSource.Pdf,
    isSold: false,
    paintKey: 'polyester',
  },
  {
    monthsBack: 1,
    day: 21,
    source: OrderSource.Estimator,
    isSold: true,
    paintKey: 'epoxy',
  },
  {
    monthsBack: 2,
    day: 10,
    source: OrderSource.Pdf,
    isSold: true,
    paintKey: 'textured',
  },
  {
    monthsBack: 2,
    day: 22,
    source: OrderSource.Estimator,
    isSold: false,
    paintKey: 'primer',
  },
  {
    monthsBack: 3,
    day: 5,
    source: OrderSource.Estimator,
    isSold: true,
    paintKey: 'epoxy',
  },
  {
    monthsBack: 4,
    day: 18,
    source: OrderSource.Pdf,
    isSold: false,
    paintKey: 'polyester',
  },
  {
    monthsBack: 5,
    day: 25,
    source: OrderSource.Estimator,
    isSold: true,
    paintKey: 'epoxy',
  },
];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The current month's orders stay between its first day and today, so the
// dashboard always shows them under "Este mês".
function dayOfPlan(plan: DemoOrderPlan, today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  if (plan.monthsBack === 0) {
    return formatDate(
      new Date(Date.UTC(year, month - 1, Math.max(1, day - plan.day))),
    );
  }
  return formatDate(
    new Date(Date.UTC(year, month - 1 - plan.monthsBack, plan.day)),
  );
}

// Dates are relative to the day the seed runs, so the data never gets old.
export function buildDemoOrders(now: Date = new Date()): DemoOrder[] {
  const today = todayInBrasilia(now);
  return DEMO_ORDER_PLANS.map((plan) => ({
    createdAt: new Date(
      startOfBrasiliaDay(dayOfPlan(plan, today)).getTime() + DEMO_HOUR_MS,
    ),
    source: plan.source,
    isSold: plan.isSold,
    paintKey: plan.paintKey,
  }));
}
