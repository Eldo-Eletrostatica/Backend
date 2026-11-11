import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryCategoriesService } from '../inventory-categories/inventory-categories.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import {
  InventoryItemCreatedResponseDto,
  InventoryItemResponseDto,
} from './dto/inventory-item-response.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';

const WITH_CATEGORY = { inventoryCategory: true } as const;

@Injectable()
export class InventoryItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItems: Repository<InventoryItem>,
    private readonly categories: InventoryCategoriesService,
  ) {}

  async create(
    input: CreateInventoryItemDto,
  ): Promise<InventoryItemCreatedResponseDto> {
    await this.categories.findActive(input.categoryId);
    const hasPossibleDuplicate = await this.inventoryItems
      .createQueryBuilder('item')
      .where('LOWER(item.name) = LOWER(:name)', { name: input.name })
      .getExists();
    const saved = await this.inventoryItems.save(
      this.inventoryItems.create({
        name: input.name,
        categoryId: input.categoryId,
        supplierName: input.supplierName,
        unit: input.unit,
        balance: input.balance ?? 0,
        minimumStock: input.minimumStock ?? 0,
      }),
    );
    const item = await this.loadItem(saved.inventoryItemId);
    return { ...this.toResponse(item), hasPossibleDuplicate };
  }

  async findAll(): Promise<InventoryItemResponseDto[]> {
    const items = await this.inventoryItems.find({
      relations: WITH_CATEGORY,
      order: { name: 'ASC' },
    });
    return items.map((item) => this.toResponse(item));
  }

  async findLowStock(): Promise<InventoryItemResponseDto[]> {
    const items = await this.inventoryItems
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.inventoryCategory', 'category')
      .where('item.balance <= item.minimum_stock')
      .orderBy('item.name', 'ASC')
      .getMany();
    return items.map((item) => this.toResponse(item));
  }

  async countLowStock(): Promise<{ count: number }> {
    const count = await this.inventoryItems
      .createQueryBuilder('item')
      .where('item.balance <= item.minimum_stock')
      .getCount();
    return { count };
  }

  async findOne(inventoryItemId: string): Promise<InventoryItemResponseDto> {
    return this.toResponse(await this.loadItem(inventoryItemId));
  }

  async update(
    inventoryItemId: string,
    input: UpdateInventoryItemDto,
  ): Promise<InventoryItemResponseDto> {
    // Loaded without the category: with both the id and the object loaded,
    // TypeORM would save the object and ignore a new id.
    const item = await this.loadItem(inventoryItemId, false);
    if (input.name !== undefined) item.name = input.name;
    // Keeping the current category is fine even if it was removed since; only
    // moving the item to another one needs an active category.
    if (
      input.categoryId !== undefined &&
      input.categoryId !== item.categoryId
    ) {
      await this.categories.findActive(input.categoryId);
      item.categoryId = input.categoryId;
    }
    if (input.supplierName !== undefined)
      item.supplierName = input.supplierName;
    if (input.unit !== undefined) item.unit = input.unit;
    if (input.minimumStock !== undefined)
      item.minimumStock = input.minimumStock;
    await this.inventoryItems.save(item);
    return this.toResponse(await this.loadItem(inventoryItemId));
  }

  async remove(inventoryItemId: string): Promise<void> {
    const item = await this.loadItem(inventoryItemId, false);
    await this.inventoryItems.softRemove(item);
  }

  private async loadItem(
    inventoryItemId: string,
    withCategory = true,
  ): Promise<InventoryItem> {
    const item = await this.inventoryItems.findOne({
      where: { inventoryItemId },
      relations: withCategory ? WITH_CATEGORY : {},
    });
    if (item === null) {
      throw new NotFoundException('Item não encontrado.');
    }
    return item;
  }

  private toResponse(item: InventoryItem): InventoryItemResponseDto {
    return {
      inventoryItemId: item.inventoryItemId,
      name: item.name,
      categoryId: item.categoryId,
      category: item.inventoryCategory.name,
      supplierName: item.supplierName,
      unit: item.unit,
      balance: item.balance,
      minimumStock: item.minimumStock,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
