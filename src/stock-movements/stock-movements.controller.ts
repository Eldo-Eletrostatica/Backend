import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { FindStockMovementsQueryDto } from './dto/find-stock-movements-query.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsService } from './stock-movements.service';

@ApiTags('stock-movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Registra uma entrada ou saída de estoque' })
  @ApiCreatedResponse({ type: StockMovement })
  @ApiNotFoundResponse({ description: 'Item ou funcionário não encontrado' })
  @ApiConflictResponse({ description: 'Saldo insuficiente' })
  create(@Body() dto: CreateStockMovementDto): Promise<StockMovement> {
    return this.stockMovementsService.create(dto);
  }

  @Get()
  @Roles(EmployeeRole.Admin, EmployeeRole.Manager)
  @ApiOperation({ summary: 'Consulta movimentações por período' })
  @ApiOkResponse({ type: [StockMovementResponseDto] })
  @ApiBadRequestResponse({ description: 'Período inválido' })
  @ApiForbiddenResponse({
    description: 'Acesso restrito a gestores e administradores',
  })
  findByPeriod(
    @Query() query: FindStockMovementsQueryDto,
  ): Promise<StockMovementResponseDto[]> {
    return this.stockMovementsService.findByPeriod(query);
  }
}
