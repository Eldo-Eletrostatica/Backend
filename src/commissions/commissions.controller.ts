import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { AccumulatedCommissionsResponseDto } from './dto/accumulated-commissions-response.dto';
import { GetCommissionsQueryDto } from './dto/get-commissions-query.dto';

@ApiTags('commissions')
@Controller('employees')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get(':employeeId/commissions')
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
}
