import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InventoryCategory } from '../inventory-categories/entities/inventory-category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { InventoryItem, InventoryUnit } from './entities/inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@Injectable()
export class InventoryItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryCategory)
    private readonly inventoryCategoryRepository: Repository<InventoryCategory>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(input: CreateInventoryItemDto) {
    const inventoryCategoryId = this.requiredString(
      input.inventoryCategoryId,
      'inventoryCategoryId',
    );
    const supplierId = this.requiredString(input.supplierId, 'supplierId');
    await this.requireReferences(inventoryCategoryId, supplierId);
    const name = this.requiredString(input.name, 'name');
    const hasPossibleDuplicate = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('LOWER(item.name) = LOWER(:name)', { name })
      .andWhere('item.deleted_at IS NULL')
      .getExists();
    const item = this.inventoryItemRepository.create({
      name,
      unit: this.requireUnit(input.unit),
      inventoryCategoryId,
      supplierId,
      balance: this.nonNegativeNumber(input.balance ?? 0, 'balance'),
      minimumStock: this.nonNegativeNumber(
        input.minimumStock ?? 0,
        'minimumStock',
      ),
    });
    return {
      ...(await this.inventoryItemRepository.save(item)),
      hasPossibleDuplicate,
    };
  }

  findAll() {
    return this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.inventoryCategory', 'category')
      .leftJoinAndSelect('item.supplier', 'supplier')
      .where('item.deleted_at IS NULL')
      .orderBy('item.name', 'ASC')
      .getMany();
  }

  findLowStock() {
    return this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.inventoryCategory', 'category')
      .where('item.deleted_at IS NULL')
      .andWhere('item.balance <= item.minimum_stock')
      .orderBy('item.name', 'ASC')
      .getMany();
  }

  async countLowStock() {
    const count = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.deleted_at IS NULL')
      .andWhere('item.balance <= item.minimum_stock')
      .getCount();
    return { count };
  }

  findOne(inventoryItemId: string) {
    return this.inventoryItemRepository
      .createQueryBuilder('item')
      .withDeleted()
      .leftJoinAndSelect('item.inventoryCategory', 'category')
      .leftJoinAndSelect('item.supplier', 'supplier')
      .where('item.inventory_item_id = :inventoryItemId', { inventoryItemId })
      .andWhere('item.deleted_at IS NULL')
      .getOne();
  }

  async update(inventoryItemId: string, input: UpdateInventoryItemDto) {
    const item = await this.inventoryItemRepository.findOneBy({
      inventoryItemId,
    });
    if (!item) return null;
    if ('name' in input) item.name = this.requiredString(input.name, 'name');
    if ('unit' in input) item.unit = this.requireUnit(input.unit);
    if ('minimumStock' in input)
      item.minimumStock = this.nonNegativeNumber(
        input.minimumStock,
        'minimumStock',
      );
    if ('inventoryCategoryId' in input || 'supplierId' in input) {
      const inventoryCategoryId = this.requiredString(
        input.inventoryCategoryId ?? item.inventoryCategoryId,
        'inventoryCategoryId',
      );
      const supplierId = this.requiredString(
        input.supplierId ?? item.supplierId,
        'supplierId',
      );
      await this.requireReferences(inventoryCategoryId, supplierId);
      item.inventoryCategoryId = inventoryCategoryId;
      item.supplierId = supplierId;
    }
    return this.inventoryItemRepository.save(item);
  }

  async remove(inventoryItemId: string) {
    const item = await this.inventoryItemRepository.findOneBy({
      inventoryItemId,
    });
    if (!item) return false;
    await this.inventoryItemRepository.softRemove(item);
    return true;
  }

  private async requireReferences(
    inventoryCategoryId: string,
    supplierId: string,
  ) {
    const [category, supplier] = await Promise.all([
      this.inventoryCategoryRepository.findOneBy({
        inventoryCategoryId,
        deletedAt: IsNull(),
      }),
      this.supplierRepository.findOneBy({ supplierId, deletedAt: IsNull() }),
    ]);
    if (!category) throw new NotFoundException('Categoria não encontrada');
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} é obrigatório`);
    }
    return value.trim();
  }

  private requireUnit(value: unknown) {
    if (!Object.values(InventoryUnit).includes(value as InventoryUnit)) {
      throw new BadRequestException('Unidade inválida');
    }
    return value as InventoryUnit;
  }

  private nonNegativeNumber(value: unknown, field: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0)
      throw new BadRequestException(`${field} deve ser maior ou igual a zero`);
    return parsed;
  }
}
