import { ColumnOptions } from 'typeorm';
import { numericTransformer } from './numeric.transformer';

// RFC 5321 limits a full e-mail address to 254 characters.
export const EMAIL_MAX_LENGTH = 254;

export const MAX_PERCENTAGE = 100;

type NumericColumnOptions = Pick<ColumnOptions, 'nullable' | 'default'>;

function numericColumn(
  precision: number,
  scale: number,
  options: NumericColumnOptions,
): ColumnOptions {
  return {
    type: 'numeric',
    precision,
    scale,
    transformer: numericTransformer,
    ...options,
  };
}

// Prices and totals in BRL.
export function moneyColumn(options: NumericColumnOptions = {}): ColumnOptions {
  return numericColumn(12, 2, options);
}

// Shared by the price rule and its snapshot in the quote item, so the copy
// always fits the original value.
export function pricePerM2Column(): ColumnOptions {
  return numericColumn(10, 2, {});
}

export function priceFactorColumn(): ColumnOptions {
  return numericColumn(6, 3, {});
}

// Stock amounts in kg, liters or units, with up to three decimals.
export function stockQuantityColumn(
  options: NumericColumnOptions = {},
): ColumnOptions {
  return numericColumn(12, 3, options);
}
