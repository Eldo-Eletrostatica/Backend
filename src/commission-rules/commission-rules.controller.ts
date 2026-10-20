import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRuleResponseDto } from './dto/commission-rule-response.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';

@ApiTags('commission-rules')
@Controller('employees')
export class CommissionRulesController {
  constructor(
    private readonly commissionRulesService: CommissionRulesService,
  ) {}

  @Get(':employeeId/commission-rule')
  @ApiOperation({
    summary: 'Consulta a regra de comissão de um funcionário',
    description:
      'Retorna a regra de comissão (percentual ou valor fixo) associada ao funcionário.',
  })
  @ApiOkResponse({
    description: 'Regra de comissão retornada com sucesso',
    type: CommissionRuleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  getRule(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<CommissionRuleResponseDto> {
    return this.commissionRulesService.getRule(employeeId);
  }

  @Patch(':employeeId/commission-rule')
  @ApiOperation({
    summary: 'Configura ou remove a regra de comissão de um funcionário',
    description:
      'Define comissão percentual ou fixa no cadastro do funcionário. Para remover a regra, envie null em ambos os campos. Exigirá perfil de administrador quando a autenticação (US09/US10) for implementada.',
  })
  @ApiOkResponse({
    description: 'Regra de comissão atualizada com sucesso',
    type: CommissionRuleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de comissão inválidos' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  updateRule(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    return this.commissionRulesService.updateRule(employeeId, dto);
  }
}
