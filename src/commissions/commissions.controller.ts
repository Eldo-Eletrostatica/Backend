import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { PeriodQueryDto } from '../common/dto/period-query.dto';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { CommissionsService } from './commissions.service';
import { AccumulatedCommissionsResponseDto } from './dto/accumulated-commissions-response.dto';
import { CommissionReportResponseDto } from './dto/commission-report-response.dto';

@ApiTags('commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
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
    @Query() query: PeriodQueryDto,
  ): Promise<AccumulatedCommissionsResponseDto> {
    return this.commissionsService.getAccumulatedCommissions(employeeId, query);
  }

  @Get('commissions/report')
  @Roles(EmployeeRole.Admin, EmployeeRole.Manager)
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
  @ApiForbiddenResponse({
    description: 'Acesso restrito a gestores e administradores',
  })
  getCommissionReport(
    @Query() query: PeriodQueryDto,
  ): Promise<CommissionReportResponseDto> {
    return this.commissionsService.getCommissionReport(query);
  }

  @Get('commissions/report/export')
  @Roles(EmployeeRole.Admin, EmployeeRole.Manager)
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
  @ApiForbiddenResponse({
    description: 'Acesso restrito a gestores e administradores',
  })
  async exportCommissionReport(
    @Query() query: PeriodQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-comissoes-${query.startDate}-a-${query.endDate}.csv"`,
    );
    return this.commissionsService.exportCommissionReportCsv(query);
  }
}
