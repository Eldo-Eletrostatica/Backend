import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import type { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import type { FindStockMovementsQueryDto } from './dto/find-stock-movements-query.dto';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  create(@Body() body: CreateStockMovementDto) {
    return this.stockMovementsService.create(body);
  }

  @Get()
  findByPeriod(@Query() query: FindStockMovementsQueryDto) {
    return this.stockMovementsService.findByPeriod(query);
  }
}
