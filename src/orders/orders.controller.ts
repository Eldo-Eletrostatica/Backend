import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiMethodNotAllowedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { EstimatedQuoteDto } from './dto/estimated-quote.dto';
import { CreateOrderItemDto as CreateOrderItemDto } from './dto/create-order-item.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  @Post('new-order')
  @ApiOperation({
    summary: 'Cadastrar um novo pedido',
  })
  @ApiCreatedResponse({
    description: 'Pedido criado com sucesso',
    type: String,
  })
  @ApiBadRequestResponse({ description: 'Dados do pedido inválidos' })
  createOrder(@Body() dto: CreateOrderDto): Promise<string> {
    return this.ordersService.createOrder(dto);
  }

  @Post('new-item')
  @ApiOperation({
    summary: 'Cadastrar item de um pedido',
  })
  @ApiCreatedResponse({
    description: 'Item criado com sucesso',
    type: String, // id do item
  })
  @ApiBadRequestResponse({ description: 'Parâmetros para item inválidos' })
  createItem(@Body() dto: CreateOrderItemDto): Promise<string> {
    return this.ordersService.createOrderItem(dto);
  }

  @Get(':orderId/get-estimate')
  @ApiOperation({
    summary: 'Solicitar orçamento automático',
  })
  @ApiOkResponse({
    description: 'Orçamento obtido com sucesso',
    type: EstimatedQuoteDto,
  })
  @ApiMethodNotAllowedResponse({
    description: 'A ferramenta de orçamento automático está desabilitada',
  })
  @ApiBadRequestResponse({
    description: 'Falha ao gerar o orçamento',
  })
  @ApiNotFoundResponse({
    description: 'Pedido não encontrado',
  })
  getBaseEstimatedQuote(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<EstimatedQuoteDto> {
    return this.ordersService.estimateQuote(orderId);
  }
}
