import { PaintTypeRankingDto } from '../dto/paint-type-ranking.dto';
import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import {
  formatConversionRate,
  formatPeriod,
  REPORT_TITLE,
} from './report-format';

export const PAINT_TYPES_SECTION_TITLE = 'Tipos de pintura mais pedidos';
export const NO_PAINT_TYPES_TEXT =
  'Nenhum pedido com tipo de pintura no período.';
export const PAINT_TYPES_TABLE_HEADERS = [
  'Posição',
  'Tipo de pintura',
  'Pedidos',
];

const ELLIPSIS = '…';

export interface ReportIndicator {
  label: string;
  value: string;
}

export interface PaintTypeBar {
  name: string;
  orderCount: number;
  // Bar length relative to the most requested paint type, from 0 to 1.
  widthRatio: number;
}

// What the PDF shows, kept apart from the drawing so it can be tested without
// reading the PDF.
export interface StatisticsReportContent {
  title: string;
  period: string;
  indicators: ReportIndicator[];
  paintTypeBars: PaintTypeBar[];
  paintTypeTableRows: string[][];
}

function buildPaintTypeBars(
  topPaintTypes: PaintTypeRankingDto[],
): PaintTypeBar[] {
  const highestOrderCount = Math.max(
    ...topPaintTypes.map((paintType) => paintType.orderCount),
  );
  return topPaintTypes.map((paintType) => ({
    name: paintType.name,
    orderCount: paintType.orderCount,
    widthRatio: paintType.orderCount / highestOrderCount,
  }));
}

function buildPaintTypeTableRows(
  topPaintTypes: PaintTypeRankingDto[],
): string[][] {
  return topPaintTypes.map((paintType, index) => [
    `${index + 1}º`,
    paintType.name,
    String(paintType.orderCount),
  ]);
}

export function buildStatisticsReportContent(
  statistics: StatisticsResponseDto,
): StatisticsReportContent {
  return {
    title: REPORT_TITLE,
    period: formatPeriod(statistics.startDate, statistics.endDate),
    indicators: [
      { label: 'Orçamentos', value: String(statistics.quoteCount) },
      {
        label: 'Viraram venda',
        value: String(statistics.convertedQuoteCount),
      },
      {
        label: 'Taxa de conversão',
        value: formatConversionRate(statistics.conversionRate),
      },
    ],
    paintTypeBars: buildPaintTypeBars(statistics.topPaintTypes),
    paintTypeTableRows: buildPaintTypeTableRows(statistics.topPaintTypes),
  };
}

// Catalog names take up to 100 characters, more than the chart label fits.
// The chart shows the cut name; the table below keeps the full one.
export function truncateToWidth(
  text: string,
  maxWidth: number,
  measureWidth: (text: string) => number,
): string {
  if (measureWidth(text) <= maxWidth) {
    return text;
  }
  let length = text.length;
  while (
    length > 0 &&
    measureWidth(text.slice(0, length).trimEnd() + ELLIPSIS) > maxWidth
  ) {
    length--;
  }
  return text.slice(0, length).trimEnd() + ELLIPSIS;
}
