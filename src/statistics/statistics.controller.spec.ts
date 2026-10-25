import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { ExportFormat } from './dto/export-statistics-query.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsController } from './statistics.controller';
import { StatisticsExportService } from './statistics-export.service';
import { StatisticsService } from './statistics.service';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let getStatistics: jest.Mock;
  let exportStatistics: jest.Mock;
  const serviceResponse: StatisticsResponseDto = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    hasData: false,
    quoteCount: 0,
    convertedQuoteCount: 0,
    conversionRate: null,
    topPaintTypes: [],
  };

  beforeEach(async () => {
    getStatistics = jest.fn().mockResolvedValue(serviceResponse);
    exportStatistics = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: StatisticsService, useValue: { getStatistics } },
        { provide: StatisticsExportService, useValue: { exportStatistics } },
      ],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
  });

  it('repassa o período ao service e devolve a resposta dele', async () => {
    const period = { startDate: '2026-10-01', endDate: '2026-10-31' };

    await expect(controller.getStatistics(period)).resolves.toBe(
      serviceResponse,
    );
    expect(getStatistics).toHaveBeenCalledWith(period);
  });

  it.each([
    [ExportFormat.Pdf, 'application/pdf', 'relatorio-estatisticas.pdf'],
    [
      ExportFormat.Xlsx,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'relatorio-estatisticas.xlsx',
    ],
  ])(
    'devolve o arquivo em %s como download (%s, %s)',
    async (format, contentType, fileName) => {
      exportStatistics.mockResolvedValue({
        content: Buffer.from('arquivo'),
        contentType,
        fileName,
      });
      const query = { startDate: '2026-10-01', endDate: '2026-10-31', format };

      const file = await controller.exportStatistics(query);

      expect(exportStatistics).toHaveBeenCalledWith(query);

      expect(file).toBeInstanceOf(StreamableFile);
      expect(file.getHeaders()).toMatchObject({
        type: contentType,
        disposition: `attachment; filename="${fileName}"`,
      });
    },
  );
});
