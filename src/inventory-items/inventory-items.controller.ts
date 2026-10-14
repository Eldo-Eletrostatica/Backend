import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { InventoryItemsService } from './inventory-items.service';
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import type { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  create(@Body() body: CreateInventoryItemDto) {
    return this.inventoryItemsService.create(body);
  }

  @Get()
  findAll() {
    return this.inventoryItemsService.findAll();
  }

  @Get('low-stock')
  findLowStock() {
    return this.inventoryItemsService.findLowStock();
  }

  @Get('low-stock/count')
  countLowStock() {
    return this.inventoryItemsService.countLowStock();
  }

  @Get(':inventoryItemId')
  async findOne(@Param('inventoryItemId') inventoryItemId: string) {
    const item = await this.inventoryItemsService.findOne(inventoryItemId);
    if (!item)
      throw new HttpException('Item não encontrado', HttpStatus.NOT_FOUND);
    return item;
  }

  @Patch(':inventoryItemId')
  async update(
    @Param('inventoryItemId') inventoryItemId: string,
    @Body() body: UpdateInventoryItemDto,
  ) {
    const item = await this.inventoryItemsService.update(inventoryItemId, body);
    if (!item)
      throw new HttpException('Item não encontrado', HttpStatus.NOT_FOUND);
    return item;
  }

  @Delete(':inventoryItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('inventoryItemId') inventoryItemId: string) {
    const removed = await this.inventoryItemsService.remove(inventoryItemId);
    if (!removed)
      throw new HttpException('Item não encontrado', HttpStatus.NOT_FOUND);
  }
}
