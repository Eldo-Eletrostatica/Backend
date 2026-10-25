import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Order } from '../orders/entities/order.entity';
import {
  ServiceOrderProgressDto,
  ServiceOrderTrackingDto,
} from './dto/service-order-response.dto';
import { UpdateServiceOrderStatusDto } from './dto/update-service-order-status.dto';
import { ServiceOrdersService } from './service-orders.service';

@ApiTags('service-orders')
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as ordens de serviço da equipe' })
  @ApiOkResponse({ type: [Order] })
  findAll(): Promise<Order[]> {
    return this.serviceOrdersService.findAll();
  }

  @Get('overdue')
  @ApiOperation({
    summary: 'Lista ordens de serviço vencidas e ainda não concluídas',
  })
  @ApiOkResponse({ type: [Order] })
  findOverdue(): Promise<Order[]> {
    return this.serviceOrdersService.findOverdue();
  }

  @Get('tracking')
  @ApiOperation({
    summary: 'Consulta pública das OS em andamento de um cliente PJ',
  })
  @ApiOkResponse({ type: [ServiceOrderProgressDto] })
  @ApiBadRequestResponse({ description: 'CNPJ ausente ou inválido' })
  findByCustomerDocument(
    @Query('cnpj') cnpj: string,
  ): Promise<ServiceOrderProgressDto[]> {
    return this.serviceOrdersService.findByCustomerDocument(cnpj);
  }

  @Get('tracking/:trackingCode')
  @ApiOperation({ summary: 'Consulta pública de uma OS pelo protocolo' })
  @ApiOkResponse({ type: ServiceOrderTrackingDto })
  @ApiBadRequestResponse({ description: 'Protocolo inválido' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  findByTrackingCode(
    @Param('trackingCode') trackingCode: string,
  ): Promise<ServiceOrderTrackingDto> {
    return this.serviceOrdersService.findByTrackingCode(trackingCode);
  }

  @Patch(':orderId/status')
  @ApiOperation({
    summary: 'Atualiza o status da OS, em qualquer ordem',
  })
  @ApiOkResponse({ type: Order })
  @ApiBadRequestResponse({ description: 'Status inválido' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  updateStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateServiceOrderStatusDto,
  ): Promise<Order> {
    return this.serviceOrdersService.updateStatus(orderId, dto.status);
  }
}
