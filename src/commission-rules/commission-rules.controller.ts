import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRuleResponseDto } from './dto/commission-rule-response.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';

@ApiTags('commission-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.Admin)
@Controller('employees')
export class CommissionRulesController {
  constructor(
    private readonly commissionRulesService: CommissionRulesService,
  ) {}

  @Get(':employeeId/commission-rule')
  @ApiOperation({
    summary: 'Consulta a regra de comissão de um funcionário',
    description:
      'Retorna a regra de comissão (percentual ou valor fixo) associada ao funcionário. Restrito a administradores.',
  })
  @ApiOkResponse({
    description: 'Regra de comissão retornada com sucesso',
    type: CommissionRuleResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
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
      'Define comissão percentual ou fixa no cadastro do funcionário. Para remover a regra, envie null em ambos os campos. Restrito a administradores.',
  })
  @ApiOkResponse({
    description: 'Regra de comissão atualizada com sucesso',
    type: CommissionRuleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de comissão inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  updateRule(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    return this.commissionRulesService.updateRule(employeeId, dto);
  }
}
