import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import { StatisticsPdfRenderer } from './statistics-pdf.renderer';

const OCTOBER_STATISTICS: StatisticsResponseDto = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  hasData: true,
  quoteCount: 10,
  convertedQuoteCount: 3,
  conversionRate: 0.3,
  topPaintTypes: [
    {
      catalogItemId: 'long-id',
      name: 'Pintura eletrostática a pó poliéster texturizada para área externa',
      orderCount: 5,
    },
    { catalogItemId: 'epoxy-id', name: 'Epóxi', orderCount: 3 },
  ],
};

describe('StatisticsPdfRenderer', () => {
  it.each([
    ['com ranking e nome longo', OCTOBER_STATISTICS.topPaintTypes],
    ['sem ranking', []],
  ])('gera um PDF %s', async (_, topPaintTypes) => {
    const pdf = await new StatisticsPdfRenderer().render({
      ...OCTOBER_STATISTICS,
      topPaintTypes,
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.subarray(-6).toString()).toContain('%%EOF');
  });
});
