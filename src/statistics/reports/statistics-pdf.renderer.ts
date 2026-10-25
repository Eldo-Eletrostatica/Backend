import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import {
  buildStatisticsReportContent,
  NO_PAINT_TYPES_TEXT,
  PAINT_TYPES_SECTION_TITLE,
  PAINT_TYPES_TABLE_HEADERS,
  PaintTypeBar,
  ReportIndicator,
  StatisticsReportContent,
  truncateToWidth,
} from './statistics-report-content';

// Sizes are in PDF points (1/72 inch). 57 pt is about 20 mm.
const PAGE_MARGIN = 57;
// PDF standard fonts: no font file to ship, and they cover Portuguese accents.
const REGULAR_FONT = 'Helvetica';
const BOLD_FONT = 'Helvetica-Bold';
const TEXT_COLOR = '#1f2328';
const MUTED_COLOR = '#59636e';
const BORDER_COLOR = '#d1d9e0';
const BAR_COLOR = '#1f6feb';

const INDICATOR_GAP = 12;
const INDICATOR_HEIGHT = 52;
const INDICATOR_PADDING = 10;

const CHART_FONT_SIZE = 10;
const CHART_LABEL_WIDTH = 140;
const CHART_LABEL_GAP = 8;
const CHART_BAR_MAX_WIDTH = 280;
const CHART_ROW_HEIGHT = 24;
const CHART_BAR_HEIGHT = 14;

const TABLE_FONT_SIZE = 10;
const TABLE_COLUMN_WIDTHS = [70, 320, 80];
const TABLE_CELL_PADDING = 6;

type PdfDocument = PDFKit.PDFDocument;

function collectPdf(document: PdfDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });
}

@Injectable()
export class StatisticsPdfRenderer {
  render(statistics: StatisticsResponseDto): Promise<Buffer> {
    const content = buildStatisticsReportContent(statistics);
    const document = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const pdf = collectPdf(document);

    this.drawHeader(document, content);
    this.drawIndicators(document, content.indicators);
    this.drawPaintTypes(document, content);
    document.end();

    return pdf;
  }

  private drawHeader(
    document: PdfDocument,
    content: StatisticsReportContent,
  ): void {
    document
      .font(BOLD_FONT)
      .fontSize(18)
      .fillColor(TEXT_COLOR)
      .text(content.title);
    document
      .font(REGULAR_FONT)
      .fontSize(11)
      .fillColor(MUTED_COLOR)
      .text(`Período: ${content.period}`);
    document.moveDown(1.5);
  }

  private drawIndicators(
    document: PdfDocument,
    indicators: ReportIndicator[],
  ): void {
    const left = document.page.margins.left;
    const top = document.y;
    const contentWidth = document.page.width - left * 2;
    const boxWidth =
      (contentWidth - INDICATOR_GAP * (indicators.length - 1)) /
      indicators.length;

    indicators.forEach((indicator, index) => {
      const boxLeft = left + index * (boxWidth + INDICATOR_GAP);
      document
        .roundedRect(boxLeft, top, boxWidth, INDICATOR_HEIGHT, 4)
        .strokeColor(BORDER_COLOR)
        .stroke();
      document
        .font(REGULAR_FONT)
        .fontSize(10)
        .fillColor(MUTED_COLOR)
        .text(indicator.label, boxLeft + INDICATOR_PADDING, top + 9);
      document
        .font(BOLD_FONT)
        .fontSize(18)
        .fillColor(TEXT_COLOR)
        .text(indicator.value, boxLeft + INDICATOR_PADDING, top + 24, {
          width: boxWidth - INDICATOR_PADDING * 2,
          lineBreak: false,
        });
    });

    document.x = left;
    document.y = top + INDICATOR_HEIGHT;
    document.moveDown(2);
  }

  private drawPaintTypes(
    document: PdfDocument,
    content: StatisticsReportContent,
  ): void {
    document
      .font(BOLD_FONT)
      .fontSize(13)
      .fillColor(TEXT_COLOR)
      .text(PAINT_TYPES_SECTION_TITLE);
    document.moveDown(0.5);

    if (content.paintTypeBars.length === 0) {
      document.font(REGULAR_FONT).fontSize(11).text(NO_PAINT_TYPES_TEXT);
      return;
    }

    this.drawPaintTypeChart(document, content.paintTypeBars);
    this.drawPaintTypeTable(document, content.paintTypeTableRows);
  }

  private drawPaintTypeChart(
    document: PdfDocument,
    bars: PaintTypeBar[],
  ): void {
    const left = document.page.margins.left;
    const barLeft = left + CHART_LABEL_WIDTH + CHART_LABEL_GAP;
    const top = document.y;
    document.font(REGULAR_FONT).fontSize(CHART_FONT_SIZE);

    bars.forEach((bar, index) => {
      const rowTop = top + index * CHART_ROW_HEIGHT;
      const barTop = rowTop + (CHART_ROW_HEIGHT - CHART_BAR_HEIGHT) / 2;
      const textTop = barTop + 2;
      const barWidth = bar.widthRatio * CHART_BAR_MAX_WIDTH;
      const label = truncateToWidth(bar.name, CHART_LABEL_WIDTH, (text) =>
        document.widthOfString(text),
      );

      document
        .fillColor(TEXT_COLOR)
        .text(label, left, textTop, { lineBreak: false });
      document
        .rect(barLeft, barTop, barWidth, CHART_BAR_HEIGHT)
        .fill(BAR_COLOR);
      document
        .fillColor(TEXT_COLOR)
        .text(String(bar.orderCount), barLeft + barWidth + 6, textTop, {
          lineBreak: false,
        });
    });

    document.x = left;
    document.y = top + bars.length * CHART_ROW_HEIGHT;
    document.moveDown(1.5);
  }

  private drawPaintTypeTable(document: PdfDocument, rows: string[][]): void {
    this.drawTableRow(document, PAINT_TYPES_TABLE_HEADERS, BOLD_FONT);
    rows.forEach((row) => this.drawTableRow(document, row, REGULAR_FONT));
  }

  // The name column wraps, so a long paint type name shows in full here.
  private drawTableRow(
    document: PdfDocument,
    cells: string[],
    font: string,
  ): void {
    const left = document.page.margins.left;
    const top = document.y;
    document.font(font).fontSize(TABLE_FONT_SIZE).fillColor(TEXT_COLOR);

    const cellHeights = cells.map((cell, index) =>
      document.heightOfString(cell, {
        width: TABLE_COLUMN_WIDTHS[index] - TABLE_CELL_PADDING * 2,
      }),
    );
    const rowHeight = Math.max(...cellHeights) + TABLE_CELL_PADDING * 2;

    let cellLeft = left;
    cells.forEach((cell, index) => {
      document.text(
        cell,
        cellLeft + TABLE_CELL_PADDING,
        top + TABLE_CELL_PADDING,
        {
          width: TABLE_COLUMN_WIDTHS[index] - TABLE_CELL_PADDING * 2,
        },
      );
      cellLeft += TABLE_COLUMN_WIDTHS[index];
    });

    const tableWidth = TABLE_COLUMN_WIDTHS.reduce((sum, width) => sum + width);
    document
      .moveTo(left, top + rowHeight)
      .lineTo(left + tableWidth, top + rowHeight)
      .strokeColor(BORDER_COLOR)
      .stroke();

    document.x = left;
    document.y = top + rowHeight;
  }
}
