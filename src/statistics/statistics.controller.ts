import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { PeriodQueryDto } from '../common/dto/period-query.dto';
import { ExportStatisticsQueryDto } from './dto/export-statistics-query.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsExportService } from './statistics-export.service';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly statisticsExportService: StatisticsExportService,
  ) {}

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

  @Get('export')
  @ApiOperation({
    summary: 'Exporta os indicadores do período em PDF ou planilha',
    description:
      'Gera um arquivo para download com os mesmos indicadores do dashboard: PDF com gráfico ou planilha XLSX.',
  })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOkResponse({ description: 'Arquivo do relatório para download' })
  @ApiBadRequestResponse({
    description: 'Formato ou período inválido, ou datas invertidas',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Não há dados para exportar no período',
  })
  async exportStatistics(
    @Query() query: ExportStatisticsQueryDto,
  ): Promise<StreamableFile> {
    const file = await this.statisticsExportService.exportStatistics(query);
    return new StreamableFile(file.content, {
      type: file.contentType,
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }
}
