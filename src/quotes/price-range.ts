import { MAX_PERCENTAGE } from '../database/columns';

const CENTS_PER_REAL = 100;

export interface PricedItem {
  areaM2: number;
  quantity: number;
  pricePerM2: number;
  priceFactor: number;
}

export interface PriceRange {
  minPrice: number;
  maxPrice: number;
}

function roundToCents(value: number): number {
  return Math.round(value * CENTS_PER_REAL) / CENTS_PER_REAL;
}

// The estimator never gives a single value (GLOSSARY: PriceRange): it goes
// from the calculated price to that price plus the negotiation margin, which
// is a percentage from 0 to 100.
export function calculatePriceRange(
  items: PricedItem[],
  negotiationMargin: number,
): PriceRange {
  const calculatedPrice = items.reduce(
    (total, item) =>
      total + item.areaM2 * item.quantity * item.pricePerM2 * item.priceFactor,
    0,
  );
  return {
    minPrice: roundToCents(calculatedPrice),
    maxPrice: roundToCents(
      calculatedPrice * (1 + negotiationMargin / MAX_PERCENTAGE),
    ),
  };
}
