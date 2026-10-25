import { calculateConversionRate } from './conversion-rate';

describe('calculateConversionRate', () => {
  it.each([
    [42, 13, 0.3095],
    [10, 10, 1],
    [8, 0, 0],
    [3, 1, 0.3333],
  ])(
    'com %i orçamentos e %i vendas, a taxa é %d',
    (quoteCount, convertedQuoteCount, expectedRate) => {
      expect(calculateConversionRate(quoteCount, convertedQuoteCount)).toBe(
        expectedRate,
      );
    },
  );

  it('não tem taxa quando o período não tem orçamentos', () => {
    expect(calculateConversionRate(0, 0)).toBeNull();
  });
});
