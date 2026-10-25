import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';
import {
  InventoryItemCreated,
  InventoryItemsService,
} from './inventory-items.service';

@ApiTags('inventory-items')
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um item de estoque' })
  @ApiCreatedResponse({ description: 'Item cadastrado' })
  create(@Body() dto: CreateInventoryItemDto): Promise<InventoryItemCreated> {
    return this.inventoryItemsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os itens de estoque' })
  @ApiOkResponse({ type: [InventoryItem] })
  findAll(): Promise<InventoryItem[]> {
    return this.inventoryItemsService.findAll();
  }

  @Get('low-stock/count')
  @ApiOperation({ summary: 'Conta os itens no estoque mínimo ou abaixo' })
  @ApiOkResponse({ description: 'Quantidade de itens em alerta' })
  countLowStock(): Promise<{ count: number }> {
    return this.inventoryItemsService.countLowStock();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Lista os itens no estoque mínimo ou abaixo' })
  @ApiOkResponse({ type: [InventoryItem] })
  findLowStock(): Promise<InventoryItem[]> {
    return this.inventoryItemsService.findLowStock();
  }

  @Get(':inventoryItemId')
  @ApiOperation({ summary: 'Consulta um item de estoque' })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  findOne(
    @Param('inventoryItemId', ParseUUIDPipe) inventoryItemId: string,
  ): Promise<InventoryItem> {
    return this.inventoryItemsService.findOne(inventoryItemId);
  }

  @Patch(':inventoryItemId')
  @ApiOperation({ summary: 'Atualiza os dados cadastrais de um item' })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  update(
    @Param('inventoryItemId', ParseUUIDPipe) inventoryItemId: string,
    @Body() dto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    return this.inventoryItemsService.update(inventoryItemId, dto);
  }

  @Delete(':inventoryItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove logicamente um item de estoque' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  remove(
    @Param('inventoryItemId', ParseUUIDPipe) inventoryItemId: string,
  ): Promise<void> {
    return this.inventoryItemsService.remove(inventoryItemId);
  }
}
