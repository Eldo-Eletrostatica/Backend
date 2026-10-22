import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PeriodQueryDto } from '../common/dto/period-query.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Indicadores do dashboard do gestor por período',
    description:
      'Volume de orçamentos, taxa de conversão e tipos de pintura mais pedidos entre startDate e endDate (fuso horário de Brasília).',
  })
  @ApiOkResponse({ type: StatisticsResponseDto })
  @ApiBadRequestResponse({
    description: 'Parâmetros de período inválidos ou datas invertidas',
  })
  getStatistics(
    @Query() period: PeriodQueryDto,
  ): Promise<StatisticsResponseDto> {
    return this.statisticsService.getStatistics(period);
  }
}
