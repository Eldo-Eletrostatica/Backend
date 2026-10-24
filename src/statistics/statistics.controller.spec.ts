import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let getStatistics: jest.Mock;
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [{ provide: StatisticsService, useValue: { getStatistics } }],
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
});
