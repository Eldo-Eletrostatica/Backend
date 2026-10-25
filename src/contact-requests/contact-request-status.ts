import { OrderStatus } from '../orders/entities/order.entity';

// A contact request starts as requested and the team marks it as handled once
// it answered the customer by WhatsApp. If it turns into business it moves on
// through the quote statuses, and this module no longer changes it.
export const CONTACT_REQUEST_STATUSES = [
  OrderStatus.Requested,
  OrderStatus.Handled,
];
