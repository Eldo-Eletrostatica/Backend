import {
  formatConversionRate,
  formatDay,
  formatPeriod,
  NO_CONVERSION_RATE_TEXT,
} from './report-format';

describe('formatDay', () => {
  it.each([
    ['2026-10-01', '01/10/2026'],
    ['2026-12-31', '31/12/2026'],
  ])('escreve %s como %s', (date, expectedText) => {
    expect(formatDay(date)).toBe(expectedText);
  });
});

describe('formatPeriod', () => {
  it.each([
    ['2026-10-01', '2026-10-31', '01/10/2026 a 31/10/2026'],
    ['2026-09-01', '2026-10-31', '01/09/2026 a 31/10/2026'],
  ])('escreve o período de %s a %s como "%s"', (start, end, expectedText) => {
    expect(formatPeriod(start, end)).toBe(expectedText);
  });
});

describe('formatConversionRate', () => {
  it.each([
    [0.3095, '30,95%'],
    [1, '100,00%'],
    [0, '0,00%'],
    [null, NO_CONVERSION_RATE_TEXT],
  ])('escreve a taxa %p como "%s"', (rate, expectedText) => {
    expect(formatConversionRate(rate)).toBe(expectedText);
  });
});
