import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CommissionsService } from './commissions.service';
import { AccumulatedCommissionsResponseDto } from './dto/accumulated-commissions-response.dto';
import { CommissionReportResponseDto } from './dto/commission-report-response.dto';
import { GetCommissionsQueryDto } from './dto/get-commissions-query.dto';
import { GetSalesRankingQueryDto } from './dto/get-sales-ranking-query.dto';
import { SalesRankingResponseDto } from './dto/sales-ranking-response.dto';

@ApiTags('commissions')
@Controller()
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('employees/:employeeId/commissions')
  @ApiOperation({
    summary: 'Consulta as comissões acumuladas de um funcionário por período',
    description:
      'Retorna o total acumulado de comissões, valor total de vendas, quantidade e lista detalhada das vendas do vendedor no período informado (fuso horário de Brasília).',
  })
  @ApiOkResponse({
    description: 'Comissões acumuladas retornadas com sucesso',
    type: AccumulatedCommissionsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parâmetros de período inválidos ou datas invertidas',
  })
  @ApiNotFoundResponse({
    description: 'Vendedor não encontrado',
  })
  getAccumulatedCommissions(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: GetCommissionsQueryDto,
  ): Promise<AccumulatedCommissionsResponseDto> {
    return this.commissionsService.getAccumulatedCommissions(employeeId, query);
  }

  @Get('commissions/report')
  @ApiOperation({
    summary: 'Relatório consolidado de comissões por funcionário por período',
    description:
      'Retorna o resumo geral e a lista de funcionários com vendas e comissões apuradas no período (fuso de Brasília), para apoio a pagamentos da gestão.',
  })
  @ApiOkResponse({
    description: 'Relatório de comissões retornado com sucesso',
    type: CommissionReportResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parâmetros de período inválidos ou datas invertidas',
  })
  getCommissionReport(
    @Query() query: GetCommissionsQueryDto,
  ): Promise<CommissionReportResponseDto> {
    return this.commissionsService.getCommissionReport(query);
  }

  @Get('commissions/ranking')
  @ApiOperation({
    summary: 'Ranking de vendas por período',
    description:
      'Retorna a lista de vendedores ordenada por valor total vendido (padrão) ou volume de vendas no período (fuso de Brasília), com posições e ticket médio.',
  })
  @ApiOkResponse({
    description: 'Ranking de vendas retornado com sucesso',
    type: SalesRankingResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parâmetros de período inválidos ou datas invertidas',
  })
  getSalesRanking(
    @Query() query: GetSalesRankingQueryDto,
  ): Promise<SalesRankingResponseDto> {
    return this.commissionsService.getSalesRanking(query);
  }

  @Get('commissions/report/export')
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'Exporta o relatório consolidado de comissões em planilha CSV',
    description:
      'Gera e faz download de uma planilha em formato CSV com delimitador ponto e vírgula e encoding UTF-8 com BOM contendo os dados do relatório de comissões.',
  })
  @ApiOkResponse({
    description: 'Planilha CSV gerada com sucesso',
    schema: { type: 'string' },
  })
  @ApiBadRequestResponse({
    description: 'Parâmetros de período inválidos ou datas invertidas',
  })
  async exportCommissionReport(
    @Query() query: GetCommissionsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-comissoes-${query.startDate}-a-${query.endDate}.csv"`,
    );
    return this.commissionsService.exportCommissionReportCsv(query);
  }

  @Get('commissions/ranking/export')
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'Exporta o ranking de vendas em planilha CSV',
    description:
      'Gera e faz download de uma planilha em formato CSV com delimitador ponto e vírgula e encoding UTF-8 com BOM contendo os dados do ranking de vendas.',
  })
  @ApiOkResponse({
    description: 'Planilha CSV gerada com sucesso',
    schema: { type: 'string' },
  })
  @ApiBadRequestResponse({
    description: 'Parâmetros de período inválidos ou datas invertidas',
  })
  async exportSalesRanking(
    @Query() query: GetSalesRankingQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ranking-vendas-${query.startDate}-a-${query.endDate}.csv"`,
    );
    return this.commissionsService.exportSalesRankingCsv(query);
  }
}
