import { OrderStatus } from '../orders/entities/order.entity';

// The stages of a quote, from the request to the answer of the customer. A
// quote that becomes a sale leaves these statuses and moves on as a service
// order, and this module no longer changes it.
export const QUOTE_STATUSES = [
  OrderStatus.Requested,
  OrderStatus.Sent,
  OrderStatus.Approved,
  OrderStatus.Rejected,
];

// What the team can mark next. The employee sends the value to the customer
// (and can send a new one while the customer negotiates), and records whether
// the customer approved or rejected it. A rejected quote can be reopened by
// sending a new value.
const NEXT_QUOTE_STATUSES: Record<string, OrderStatus[]> = {
  [OrderStatus.Requested]: [OrderStatus.Sent, OrderStatus.Rejected],
  [OrderStatus.Sent]: [
    OrderStatus.Sent,
    OrderStatus.Approved,
    OrderStatus.Rejected,
  ],
  [OrderStatus.Approved]: [OrderStatus.Sent, OrderStatus.Rejected],
  [OrderStatus.Rejected]: [OrderStatus.Sent],
};

export function canMoveQuote(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_QUOTE_STATUSES[from]?.includes(to) ?? false;
}
