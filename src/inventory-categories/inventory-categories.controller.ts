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
import { InventoryCategoriesService } from './inventory-categories.service';
import type {
  InventoryCategoryDto,
  UpdateInventoryCategoryDto,
} from './dto/inventory-category.dto';

@Controller('inventory-categories')
export class InventoryCategoriesController {
  constructor(
    private readonly inventoryCategoriesService: InventoryCategoriesService,
  ) {}

  @Get()
  findAll() {
    return this.inventoryCategoriesService.findAll();
  }

  @Post()
  create(@Body() body: InventoryCategoryDto) {
    return this.inventoryCategoriesService.create(body.name);
  }

  @Patch(':inventoryCategoryId')
  async update(
    @Param('inventoryCategoryId') inventoryCategoryId: string,
    @Body() body: UpdateInventoryCategoryDto,
  ) {
    const category = await this.inventoryCategoriesService.update(
      inventoryCategoryId,
      body.name,
    );
    if (!category)
      throw new HttpException('Categoria não encontrada', HttpStatus.NOT_FOUND);
    return category;
  }

  @Delete(':inventoryCategoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('inventoryCategoryId') inventoryCategoryId: string) {
    const removed =
      await this.inventoryCategoriesService.remove(inventoryCategoryId);
    if (!removed)
      throw new HttpException('Categoria não encontrada', HttpStatus.NOT_FOUND);
  }
}
