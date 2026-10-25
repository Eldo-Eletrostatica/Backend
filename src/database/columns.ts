import { ColumnOptions } from 'typeorm';
import { numericTransformer } from './numeric.transformer';

// RFC 5321 limits a full e-mail address to 254 characters.
export const EMAIL_MAX_LENGTH = 254;
export const EMPLOYEE_NAME_MAX_LENGTH = 120;

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

// Largest values of numeric(10,2) and numeric(6,3).
export const MAX_PRICE_PER_M2 = 99_999_999.99;
export const MAX_PRICE_FACTOR = 999.999;

// Shared by the catalog item and its snapshot in the order item, so the copy
// always fits the original value.
export function pricePerM2Column(
  options: NumericColumnOptions = {},
): ColumnOptions {
  return numericColumn(10, 2, options);
}

export function priceFactorColumn(
  options: NumericColumnOptions = {},
): ColumnOptions {
  return numericColumn(6, 3, options);
}

// Stock amounts in kg, liters or units, with up to three decimals.
// numeric(12, 3) leaves nine digits before the decimal point.
export const MAX_STOCK_QUANTITY = 999_999_999.999;

export function stockQuantityColumn(
  options: NumericColumnOptions = {},
): ColumnOptions {
  return numericColumn(12, 3, options);
}
