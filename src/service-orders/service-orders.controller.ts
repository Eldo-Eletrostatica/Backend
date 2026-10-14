import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import type { CreateServiceOrderDto } from './dto/create-service-order.dto';
import type { UpdateServiceOrderStatusDto } from './dto/update-service-order-status.dto';

@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  create(@Body() body: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(body);
  }

  @Get()
  findAll() {
    return this.serviceOrdersService.findAll();
  }

  @Get('overdue')
  findOverdue() {
    return this.serviceOrdersService.findOverdue();
  }

  @Get('tracking')
  findByCustomerDocument(@Query('cnpj') cnpj: string) {
    return this.serviceOrdersService.findByCustomerDocument(cnpj);
  }

  @Get('tracking/:trackingCode')
  async findByTrackingCode(@Param('trackingCode') trackingCode: string) {
    const order =
      await this.serviceOrdersService.findByTrackingCode(trackingCode);
    if (!order)
      throw new HttpException(
        'Ordem de serviço não encontrada',
        HttpStatus.NOT_FOUND,
      );
    return order;
  }

  @Patch(':serviceOrderId/status')
  async updateStatus(
    @Param('serviceOrderId') serviceOrderId: string,
    @Body() body: UpdateServiceOrderStatusDto,
  ) {
    const order = await this.serviceOrdersService.updateStatus(
      serviceOrderId,
      body.status,
    );
    if (!order)
      throw new HttpException(
        'Ordem de serviço não encontrada',
        HttpStatus.NOT_FOUND,
      );
    return order;
  }
}
