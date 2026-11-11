import { OrderStatus } from '../orders/entities/order.entity';
import { canMoveQuote } from './quote-status';

describe('canMoveQuote', () => {
  it.each([
    [OrderStatus.Requested, OrderStatus.Sent],
    [OrderStatus.Requested, OrderStatus.Rejected],
    [OrderStatus.Sent, OrderStatus.Sent],
    [OrderStatus.Sent, OrderStatus.Approved],
    [OrderStatus.Sent, OrderStatus.Rejected],
    [OrderStatus.Approved, OrderStatus.Sent],
    [OrderStatus.Approved, OrderStatus.Rejected],
    [OrderStatus.Rejected, OrderStatus.Sent],
  ])('permite %s para %s', (from, to) => {
    expect(canMoveQuote(from, to)).toBe(true);
  });

  it.each([
    [OrderStatus.Requested, OrderStatus.Approved],
    [OrderStatus.Requested, OrderStatus.Requested],
    [OrderStatus.Rejected, OrderStatus.Approved],
    [OrderStatus.Approved, OrderStatus.Approved],
  ])('não permite %s para %s', (from, to) => {
    expect(canMoveQuote(from, to)).toBe(false);
  });

  it('não move pedidos que já viraram venda ou que não são orçamento', () => {
    expect(canMoveQuote(OrderStatus.Queued, OrderStatus.Sent)).toBe(false);
    expect(canMoveQuote(OrderStatus.Handled, OrderStatus.Sent)).toBe(false);
  });
});
