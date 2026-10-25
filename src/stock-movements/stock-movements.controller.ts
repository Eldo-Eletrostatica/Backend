import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { FindStockMovementsQueryDto } from './dto/find-stock-movements-query.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsService } from './stock-movements.service';

@ApiTags('stock-movements')
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
  @ApiOperation({ summary: 'Consulta movimentações por período' })
  @ApiOkResponse({ type: [StockMovementResponseDto] })
  @ApiBadRequestResponse({ description: 'Período inválido' })
  findByPeriod(
    @Query() query: FindStockMovementsQueryDto,
  ): Promise<StockMovementResponseDto[]> {
    return this.stockMovementsService.findByPeriod(query);
  }
}
