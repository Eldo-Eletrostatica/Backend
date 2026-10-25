import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import {
  buildStatisticsReportContent,
  truncateToWidth,
} from './statistics-report-content';

const OCTOBER_STATISTICS: StatisticsResponseDto = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  hasData: true,
  quoteCount: 10,
  convertedQuoteCount: 3,
  conversionRate: 0.3,
  topPaintTypes: [
    { catalogItemId: 'epoxy-id', name: 'Epóxi', orderCount: 5 },
    { catalogItemId: 'powder-id', name: 'Pintura a pó', orderCount: 3 },
  ],
};

describe('buildStatisticsReportContent', () => {
  it('escreve o período por extenso', () => {
    expect(buildStatisticsReportContent(OCTOBER_STATISTICS).period).toBe(
      '01/10/2026 a 31/10/2026',
    );
  });

  it.each([
    ['Orçamentos', '10'],
    ['Viraram venda', '3'],
    ['Taxa de conversão', '30,00%'],
  ])('mostra o indicador %s = %s', (label, expectedValue) => {
    const { indicators } = buildStatisticsReportContent(OCTOBER_STATISTICS);

    expect(indicators).toContainEqual({ label, value: expectedValue });
  });

  it.each([
    [0, 'Epóxi', 1],
    [1, 'Pintura a pó', 0.6],
  ])(
    'a barra %i (%s) tem largura proporcional %p à do mais pedido',
    (index, expectedName, expectedRatio) => {
      const bar =
        buildStatisticsReportContent(OCTOBER_STATISTICS).paintTypeBars[index];

      expect(bar.name).toBe(expectedName);
      expect(bar.widthRatio).toBeCloseTo(expectedRatio);
    },
  );

  it.each([
    [OCTOBER_STATISTICS.topPaintTypes, ['1º', 'Epóxi', '5']],
    [[], undefined],
  ])(
    'com o ranking %j, a primeira linha da tabela é %j',
    (topPaintTypes, expectedFirstRow) => {
      const content = buildStatisticsReportContent({
        ...OCTOBER_STATISTICS,
        topPaintTypes,
      });

      expect(content.paintTypeTableRows[0]).toEqual(expectedFirstRow);
      expect(content.paintTypeBars).toHaveLength(topPaintTypes.length);
    },
  );
});

describe('truncateToWidth', () => {
  // Fake font where every character is 10 points wide.
  const measureWidth = (text: string) => text.length * 10;

  it.each([
    ['Epóxi', 100, 'Epóxi'],
    ['Pintura eletrostática a pó poliéster', 100, 'Pintura e…'],
    ['Pintura eletrostática a pó poliéster', 90, 'Pintura…'],
  ])(
    'corta "%s" para caber em %i pontos: "%s"',
    (text, maxWidth, expectedText) => {
      const truncated = truncateToWidth(text, maxWidth, measureWidth);

      expect(truncated).toBe(expectedText);
      expect(measureWidth(truncated)).toBeLessThanOrEqual(maxWidth);
    },
  );
});
