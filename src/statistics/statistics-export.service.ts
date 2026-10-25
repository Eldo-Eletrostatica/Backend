import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import {
  ExportFormat,
  ExportStatisticsQueryDto,
} from './dto/export-statistics-query.dto';
import { StatisticsPdfRenderer } from './reports/statistics-pdf.renderer';
import { StatisticsSpreadsheetBuilder } from './reports/statistics-spreadsheet.builder';
import { StatisticsService } from './statistics.service';

export const NO_DATA_TO_EXPORT_MESSAGE =
  'Não há dados para exportar no período.';

const CONTENT_TYPES: Record<ExportFormat, string> = {
  [ExportFormat.Pdf]: 'application/pdf',
  [ExportFormat.Xlsx]:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export interface ExportedFile {
  content: Buffer;
  contentType: string;
  fileName: string;
}

@Injectable()
export class StatisticsExportService {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly statisticsPdfRenderer: StatisticsPdfRenderer,
    private readonly statisticsSpreadsheetBuilder: StatisticsSpreadsheetBuilder,
  ) {}

  // The file holds the same numbers the dashboard shows for the period. The
  // name follows the US24 reports (relatorio-comissoes-...).
  async exportStatistics(
    query: ExportStatisticsQueryDto,
  ): Promise<ExportedFile> {
    const statistics = await this.statisticsService.getStatistics(query);
    if (!statistics.hasData) {
      throw new UnprocessableEntityException(NO_DATA_TO_EXPORT_MESSAGE);
    }

    return {
      content: await this.buildFile(query.format, statistics),
      contentType: CONTENT_TYPES[query.format],
      fileName: `relatorio-estatisticas-${query.startDate}-a-${query.endDate}.${query.format}`,
    };
  }

  private buildFile(
    format: ExportFormat,
    statistics: StatisticsResponseDto,
  ): Promise<Buffer> {
    if (format === ExportFormat.Pdf) {
      return this.statisticsPdfRenderer.render(statistics);
    }
    return this.statisticsSpreadsheetBuilder.build(statistics);
  }
}
