// Four decimal places keep a percentage with two decimals (30.95%) and spare
// the dashboard from long floats such as 0.30952380952380953.
const CONVERSION_RATE_DECIMALS = 4;

// Share of the period's quotes that already became a sale, from 0 to 1. A
// period without quotes has no rate, which is different from a rate of 0.
export function calculateConversionRate(
  quoteCount: number,
  convertedQuoteCount: number,
): number | null {
  if (quoteCount === 0) {
    return null;
  }
  const rate = convertedQuoteCount / quoteCount;
  return Number(rate.toFixed(CONVERSION_RATE_DECIMALS));
}
