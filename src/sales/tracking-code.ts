import { randomInt } from 'node:crypto';
import { TRACKING_CODE_LENGTH } from '../orders/entities/order.entity';

// Letters and digits without 0, O, 1 and I, which are easy to mix up when the
// customer types the code (ADR 0001). 32 symbols over 8 positions is about
// 1.1e12 combinations, enough for the code to be impossible to guess.
export const TRACKING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTrackingCode(): string {
  return Array.from(
    { length: TRACKING_CODE_LENGTH },
    () => TRACKING_CODE_ALPHABET[randomInt(TRACKING_CODE_ALPHABET.length)],
  ).join('');
}
