import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import {
  buildStatisticsReportHtml,
  escapeHtml,
} from './statistics-report-html';

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

describe('escapeHtml', () => {
  it.each([
    ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
    ['Tinta "A" & \'B\'', 'Tinta &quot;A&quot; &amp; &#39;B&#39;'],
    ['Epóxi', 'Epóxi'],
  ])('escapa %s como %s', (text, expectedHtml) => {
    expect(escapeHtml(text)).toBe(expectedHtml);
  });
});

describe('buildStatisticsReportHtml', () => {
  it.each([
    ['o período', '01/10/2026 a 31/10/2026'],
    ['o volume de orçamentos', '<strong>10</strong>'],
    ['as vendas', '<strong>3</strong>'],
    ['a taxa de conversão', '<strong>30,00%</strong>'],
    ['o tipo de pintura mais pedido', '<td>1º</td><td>Epóxi</td><td>5</td>'],
    ['o gráfico de barras', '<svg'],
  ])('mostra %s: %s', (_, expectedHtml) => {
    expect(buildStatisticsReportHtml(OCTOBER_STATISTICS)).toContain(
      expectedHtml,
    );
  });

  it('não deixa um nome cadastrado virar HTML no relatório', () => {
    const html = buildStatisticsReportHtml({
      ...OCTOBER_STATISTICS,
      topPaintTypes: [
        { catalogItemId: 'id', name: '<img src=x>', orderCount: 1 },
      ],
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x&gt;');
  });

  it.each([
    [[], 'Nenhum pedido com tipo de pintura no período.'],
    [OCTOBER_STATISTICS.topPaintTypes, 'Tipos de pintura mais pedidos'],
  ])('com o ranking %j, mostra "%s"', (topPaintTypes, expectedText) => {
    const html = buildStatisticsReportHtml({
      ...OCTOBER_STATISTICS,
      topPaintTypes,
    });

    expect(html).toContain(expectedText);
  });
});
