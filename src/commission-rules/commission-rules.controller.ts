import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRuleResponseDto } from './dto/commission-rule-response.dto';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { FindCommissionRulesQueryDto } from './dto/find-commission-rules-query.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('commission-rules')
@Controller('commission-rules')
@UseGuards(AdminGuard)
export class CommissionRulesController {
  constructor(
    private readonly commissionRulesService: CommissionRulesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Cria uma nova regra de comissão',
    description:
      'Cadastra regra percentual ou fixa, para escopo global ou individual por funcionário, com validação de sobreposição de faixas.',
  })
  @ApiCreatedResponse({
    description: 'Regra criada com sucesso',
    type: CommissionRuleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de entrada inválidos' })
  @ApiConflictResponse({
    description: 'Sobreposição de faixas para o mesmo escopo',
  })
  @ApiForbiddenResponse({
    description: 'Acesso permitido apenas para administradores',
  })
  create(
    @Body() dto: CreateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    return this.commissionRulesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista as regras de comissão cadastradas',
    description: 'Permite filtrar por escopo, funcionário e status ativo.',
  })
  @ApiOkResponse({
    description: 'Lista de regras retornada',
    type: [CommissionRuleResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Acesso permitido apenas para administradores',
  })
  findAll(
    @Query() query: FindCommissionRulesQueryDto,
  ): Promise<CommissionRuleResponseDto[]> {
    return this.commissionRulesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma regra de comissão pelo ID' })
  @ApiOkResponse({
    description: 'Regra encontrada',
    type: CommissionRuleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Regra não encontrada' })
  @ApiForbiddenResponse({
    description: 'Acesso permitido apenas para administradores',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommissionRuleResponseDto> {
    return this.commissionRulesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma regra de comissão existente' })
  @ApiOkResponse({
    description: 'Regra atualizada com sucesso',
    type: CommissionRuleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de entrada inválidos' })
  @ApiConflictResponse({
    description: 'Sobreposição de faixas para o mesmo escopo',
  })
  @ApiNotFoundResponse({ description: 'Regra não encontrada' })
  @ApiForbiddenResponse({
    description: 'Acesso permitido apenas para administradores',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    return this.commissionRulesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativa/remove uma regra de comissão (soft delete)',
  })
  @ApiNoContentResponse({ description: 'Regra desativada com sucesso' })
  @ApiNotFoundResponse({ description: 'Regra não encontrada' })
  @ApiForbiddenResponse({
    description: 'Acesso permitido apenas para administradores',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commissionRulesService.remove(id);
  }
}
