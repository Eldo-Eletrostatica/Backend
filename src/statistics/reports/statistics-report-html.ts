import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import { PaintTypeRankingDto } from '../dto/paint-type-ranking.dto';
import {
  formatConversionRate,
  formatPeriod,
  REPORT_TITLE,
} from './report-format';

const CHART_LABEL_WIDTH = 160;
const CHART_BAR_MAX_WIDTH = 340;
const CHART_VALUE_WIDTH = 40;
const CHART_ROW_HEIGHT = 32;
const CHART_BAR_HEIGHT = 20;
const CHART_BAR_COLOR = '#1f6feb';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Paint type names are typed by the staff, so they are escaped before they go
// into the page that Chromium prints.
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

// Horizontal bar chart drawn as inline SVG: the page needs no chart library
// and no network access to be printed.
function buildPaintTypeChart(topPaintTypes: PaintTypeRankingDto[]): string {
  const highestOrderCount = Math.max(
    ...topPaintTypes.map((paintType) => paintType.orderCount),
  );
  const chartWidth =
    CHART_LABEL_WIDTH + CHART_BAR_MAX_WIDTH + CHART_VALUE_WIDTH;
  const chartHeight = topPaintTypes.length * CHART_ROW_HEIGHT;

  const rows = topPaintTypes.map((paintType, index) => {
    const barWidth =
      (paintType.orderCount / highestOrderCount) * CHART_BAR_MAX_WIDTH;
    const rowTop = index * CHART_ROW_HEIGHT;
    const textBaseline = rowTop + CHART_ROW_HEIGHT / 2 + 5;
    return `
      <text x="0" y="${textBaseline}">${escapeHtml(paintType.name)}</text>
      <rect x="${CHART_LABEL_WIDTH}" y="${rowTop + (CHART_ROW_HEIGHT - CHART_BAR_HEIGHT) / 2}"
            width="${barWidth}" height="${CHART_BAR_HEIGHT}" fill="${CHART_BAR_COLOR}" />
      <text x="${CHART_LABEL_WIDTH + barWidth + 8}" y="${textBaseline}">${paintType.orderCount}</text>`;
  });

  return `<svg width="${chartWidth}" height="${chartHeight}" font-size="13">${rows.join('')}</svg>`;
}

function buildPaintTypeTable(topPaintTypes: PaintTypeRankingDto[]): string {
  const rows = topPaintTypes.map(
    (paintType, index) =>
      `<tr><td>${index + 1}º</td><td>${escapeHtml(paintType.name)}</td><td>${paintType.orderCount}</td></tr>`,
  );
  return `
    <table>
      <thead><tr><th>Posição</th><th>Tipo de pintura</th><th>Pedidos</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

export function buildStatisticsReportHtml(
  statistics: StatisticsResponseDto,
): string {
  const paintTypesSection =
    statistics.topPaintTypes.length > 0
      ? buildPaintTypeChart(statistics.topPaintTypes) +
        buildPaintTypeTable(statistics.topPaintTypes)
      : '<p>Nenhum pedido com tipo de pintura no período.</p>';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Noto Sans', sans-serif; color: #1f2328; margin: 0; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 28px 0 12px; }
    .period { color: #59636e; margin: 0 0 24px; }
    .indicators { display: flex; gap: 16px; }
    .indicator { flex: 1; border: 1px solid #d1d9e0; border-radius: 6px; padding: 12px; }
    .indicator strong { display: block; font-size: 24px; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }
    th, td { border-bottom: 1px solid #d1d9e0; padding: 6px 8px; text-align: left; }
  </style>
</head>
<body>
  <h1>${REPORT_TITLE}</h1>
  <p class="period">Período: ${formatPeriod(statistics.startDate, statistics.endDate)}</p>

  <div class="indicators">
    <div class="indicator">Orçamentos<strong>${statistics.quoteCount}</strong></div>
    <div class="indicator">Viraram venda<strong>${statistics.convertedQuoteCount}</strong></div>
    <div class="indicator">Taxa de conversão<strong>${formatConversionRate(statistics.conversionRate)}</strong></div>
  </div>

  <h2>Tipos de pintura mais pedidos</h2>
  ${paintTypesSection}
</body>
</html>`;
}
