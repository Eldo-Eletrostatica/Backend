import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { GetSalesRankingQueryDto } from './dto/get-sales-ranking-query.dto';
import { SalesRankingResponseDto } from './dto/sales-ranking-response.dto';
import { SalesRankingsService } from './sales-rankings.service';

@ApiTags('sales-rankings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.Admin, EmployeeRole.Manager)
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
@ApiForbiddenResponse({
  description: 'Acesso restrito a gestores e administradores',
})
@Controller('sales-rankings')
export class SalesRankingsController {
  constructor(private readonly salesRankingsService: SalesRankingsService) {}

  @Get()
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
    return this.salesRankingsService.getSalesRanking(query);
  }

  @Get('export')
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
    return this.salesRankingsService.exportSalesRankingCsv(query);
  }
}
