import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InventoryCategory } from './entities/inventory-category.entity';

@Injectable()
export class InventoryCategoriesService {
  constructor(
    @InjectRepository(InventoryCategory)
    private readonly inventoryCategoryRepository: Repository<InventoryCategory>,
  ) {}

  findAll() {
    return this.inventoryCategoryRepository.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
  }

  async create(value: unknown) {
    const name = this.requiredName(value);
    await this.ensureNameIsAvailable(name);
    return this.inventoryCategoryRepository.save(
      this.inventoryCategoryRepository.create({ name }),
    );
  }

  async update(inventoryCategoryId: string, value: unknown) {
    const category = await this.inventoryCategoryRepository.findOneBy({
      inventoryCategoryId,
    });
    if (!category) return null;
    const name = this.requiredName(value);
    await this.ensureNameIsAvailable(name, inventoryCategoryId);
    category.name = name;
    return this.inventoryCategoryRepository.save(category);
  }

  async remove(inventoryCategoryId: string) {
    const category = await this.inventoryCategoryRepository.findOneBy({
      inventoryCategoryId,
    });
    if (!category) return false;
    await this.inventoryCategoryRepository.softRemove(category);
    return true;
  }

  private requiredName(value: unknown) {
    if (
      typeof value !== 'string' ||
      value.trim().length === 0 ||
      value.trim().length > 100
    ) {
      throw new BadRequestException(
        'Nome da categoria é obrigatório e deve ter até 100 caracteres',
      );
    }
    return value.trim();
  }

  private async ensureNameIsAvailable(name: string, excludedId?: string) {
    const query = this.inventoryCategoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .andWhere('category.deleted_at IS NULL');
    if (excludedId)
      query.andWhere('category.inventory_category_id <> :excludedId', {
        excludedId,
      });
    if (await query.getOne())
      throw new ConflictException('Já existe uma categoria com esse nome');
  }
}
