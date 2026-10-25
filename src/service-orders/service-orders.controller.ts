import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Lista as ordens de serviço da equipe' })
  @ApiOkResponse({ type: [Order] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  findAll(): Promise<Order[]> {
    return this.serviceOrdersService.findAll();
  }

  @Get('overdue')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin, EmployeeRole.Manager)
  @ApiOperation({
    summary: 'Lista ordens de serviço vencidas e ainda não concluídas',
  })
  @ApiOkResponse({ type: [Order] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({
    description: 'Acesso restrito a gestores e administradores',
  })
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Atualiza o status da OS, em qualquer ordem',
  })
  @ApiOkResponse({ type: Order })
  @ApiBadRequestResponse({ description: 'Status inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  updateStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateServiceOrderStatusDto,
  ): Promise<Order> {
    return this.serviceOrdersService.updateStatus(orderId, dto.status);
  }
}
