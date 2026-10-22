import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import {
  formatConversionRate,
  formatPeriod,
  REPORT_TITLE,
} from './report-format';

export const INDICATORS_SHEET_NAME = 'Indicadores';
export const PAINT_TYPES_SHEET_NAME = 'Tipos de pintura';

@Injectable()
export class StatisticsSpreadsheetBuilder {
  async build(statistics: StatisticsResponseDto): Promise<Buffer> {
    const workbook = new Workbook();
    this.addIndicatorsSheet(workbook, statistics);
    this.addPaintTypesSheet(workbook, statistics);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private addIndicatorsSheet(
    workbook: Workbook,
    statistics: StatisticsResponseDto,
  ): void {
    const sheet = workbook.addWorksheet(INDICATORS_SHEET_NAME);
    sheet.columns = [{ width: 24 }, { width: 28 }];
    sheet.addRows([
      [REPORT_TITLE],
      ['Período', formatPeriod(statistics.startDate, statistics.endDate)],
      [],
      ['Orçamentos', statistics.quoteCount],
      ['Viraram venda', statistics.convertedQuoteCount],
      ['Taxa de conversão', formatConversionRate(statistics.conversionRate)],
    ]);
    sheet.getRow(1).font = { bold: true, size: 14 };
  }

  private addPaintTypesSheet(
    workbook: Workbook,
    statistics: StatisticsResponseDto,
  ): void {
    const sheet = workbook.addWorksheet(PAINT_TYPES_SHEET_NAME);
    sheet.columns = [
      { header: 'Posição', width: 10 },
      { header: 'Tipo de pintura', width: 30 },
      { header: 'Pedidos', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    statistics.topPaintTypes.forEach((paintType, index) => {
      sheet.addRow([index + 1, paintType.name, paintType.orderCount]);
    });
  }
}
