import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';

export type InventoryItemCreated = InventoryItem & {
  hasPossibleDuplicate: boolean;
};

@Injectable()
export class InventoryItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItems: Repository<InventoryItem>,
  ) {}

  async create(input: CreateInventoryItemDto): Promise<InventoryItemCreated> {
    const hasPossibleDuplicate = await this.inventoryItems
      .createQueryBuilder('item')
      .where('LOWER(item.name) = LOWER(:name)', { name: input.name })
      .getExists();
    const item = await this.inventoryItems.save(
      this.inventoryItems.create({
        name: input.name,
        category: input.category,
        supplierName: input.supplierName,
        unit: input.unit,
        balance: input.balance ?? 0,
        minimumStock: input.minimumStock ?? 0,
      }),
    );
    return { ...item, hasPossibleDuplicate };
  }

  findAll(): Promise<InventoryItem[]> {
    return this.inventoryItems.find({ order: { name: 'ASC' } });
  }

  findLowStock(): Promise<InventoryItem[]> {
    return this.inventoryItems
      .createQueryBuilder('item')
      .where('item.balance <= item.minimum_stock')
      .orderBy('item.name', 'ASC')
      .getMany();
  }

  async countLowStock(): Promise<{ count: number }> {
    const count = await this.inventoryItems
      .createQueryBuilder('item')
      .where('item.balance <= item.minimum_stock')
      .getCount();
    return { count };
  }

  async findOne(inventoryItemId: string): Promise<InventoryItem> {
    const item = await this.inventoryItems.findOneBy({ inventoryItemId });
    if (item === null) {
      throw new NotFoundException('Item não encontrado.');
    }
    return item;
  }

  async update(
    inventoryItemId: string,
    input: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    const item = await this.findOne(inventoryItemId);
    if (input.name !== undefined) item.name = input.name;
    if (input.category !== undefined) item.category = input.category;
    if (input.supplierName !== undefined)
      item.supplierName = input.supplierName;
    if (input.unit !== undefined) item.unit = input.unit;
    if (input.minimumStock !== undefined)
      item.minimumStock = input.minimumStock;
    return this.inventoryItems.save(item);
  }

  async remove(inventoryItemId: string): Promise<void> {
    const item = await this.findOne(inventoryItemId);
    await this.inventoryItems.softRemove(item);
  }
}
