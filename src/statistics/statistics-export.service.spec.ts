import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { ExportFormat } from './dto/export-statistics-query.dto';
import { StatisticsPdfRenderer } from './reports/statistics-pdf.renderer';
import { StatisticsSpreadsheetBuilder } from './reports/statistics-spreadsheet.builder';
import {
  NO_DATA_TO_EXPORT_MESSAGE,
  StatisticsExportService,
} from './statistics-export.service';
import { StatisticsService } from './statistics.service';

const OCTOBER = { startDate: '2026-10-01', endDate: '2026-10-31' };
const PDF_CONTENT = Buffer.from('pdf');
const XLSX_CONTENT = Buffer.from('xlsx');

const STATISTICS_WITH_DATA: StatisticsResponseDto = {
  ...OCTOBER,
  hasData: true,
  quoteCount: 10,
  convertedQuoteCount: 3,
  conversionRate: 0.3,
  topPaintTypes: [],
};

describe('StatisticsExportService', () => {
  let service: StatisticsExportService;
  let getStatistics: jest.Mock;
  let renderPdf: jest.Mock;
  let buildSpreadsheet: jest.Mock;

  beforeEach(async () => {
    getStatistics = jest.fn().mockResolvedValue(STATISTICS_WITH_DATA);
    renderPdf = jest.fn().mockResolvedValue(PDF_CONTENT);
    buildSpreadsheet = jest.fn().mockResolvedValue(XLSX_CONTENT);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsExportService,
        { provide: StatisticsService, useValue: { getStatistics } },
        { provide: StatisticsPdfRenderer, useValue: { render: renderPdf } },
        {
          provide: StatisticsSpreadsheetBuilder,
          useValue: { build: buildSpreadsheet },
        },
      ],
    }).compile();

    service = module.get<StatisticsExportService>(StatisticsExportService);
  });

  it.each([
    [
      ExportFormat.Pdf,
      PDF_CONTENT,
      'application/pdf',
      'estatisticas-2026-10-01-a-2026-10-31.pdf',
    ],
    [
      ExportFormat.Xlsx,
      XLSX_CONTENT,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'estatisticas-2026-10-01-a-2026-10-31.xlsx',
    ],
  ])(
    'exporta em %s com o conteúdo, o tipo e o nome do arquivo certos',
    async (format, expectedContent, expectedContentType, expectedFileName) => {
      const file = await service.exportStatistics({ ...OCTOBER, format });

      expect(file).toEqual({
        content: expectedContent,
        contentType: expectedContentType,
        fileName: expectedFileName,
      });
    },
  );

  it.each([
    [ExportFormat.Pdf, 'PDF'],
    [ExportFormat.Xlsx, 'planilha'],
  ])(
    'avisa que não há dados quando o período está vazio (%s, %s)',
    async (format) => {
      getStatistics.mockResolvedValue({
        ...STATISTICS_WITH_DATA,
        hasData: false,
      });

      await expect(
        service.exportStatistics({ ...OCTOBER, format }),
      ).rejects.toThrow(
        new UnprocessableEntityException(NO_DATA_TO_EXPORT_MESSAGE),
      );
      expect(renderPdf).not.toHaveBeenCalled();
      expect(buildSpreadsheet).not.toHaveBeenCalled();
    },
  );
});
