import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { LaunchSaleDto } from './dto/launch-sale.dto';
import { SaleResponseDto } from './dto/sale-response.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({
    summary: 'Lança uma venda',
    description:
      'Com orderId, converte um orçamento aprovado em venda. Sem ele, registra uma venda direta com cliente e itens. Nos dois casos gera o protocolo e deixa a OS em fila.',
  })
  @ApiCreatedResponse({ type: SaleResponseDto })
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  @ApiNotFoundResponse({ description: 'Orçamento ou vendedor não encontrado' })
  @ApiConflictResponse({
    description: 'O orçamento já foi convertido em venda',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Orçamento não aprovado ou item de catálogo inválido',
  })
  launchSale(@Body() dto: LaunchSaleDto): Promise<SaleResponseDto> {
    return this.salesService.launchSale(dto);
  }
}
