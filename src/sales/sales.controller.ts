import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LaunchSaleDto } from './dto/launch-sale.dto';
import { SaleResponseDto } from './dto/sale-response.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
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
