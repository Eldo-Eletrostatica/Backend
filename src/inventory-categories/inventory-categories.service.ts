import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InventoryCategoryResponseDto } from './dto/inventory-category-response.dto';
import { InventoryCategory } from './entities/inventory-category.entity';

const DUPLICATE_NAME_MESSAGE = 'Já existe uma categoria com esse nome.';

@Injectable()
export class InventoryCategoriesService {
  constructor(
    @InjectRepository(InventoryCategory)
    private readonly categories: Repository<InventoryCategory>,
  ) {}

  async findAll(): Promise<InventoryCategoryResponseDto[]> {
    const categories = await this.categories.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
    return categories.map((category) => this.toResponse(category));
  }

  async create(name: string): Promise<InventoryCategoryResponseDto> {
    await this.assertNameIsFree(name);
    const category = await this.categories.save(
      this.categories.create({ name }),
    );
    return this.toResponse(category);
  }

  async rename(
    inventoryCategoryId: string,
    name: string,
  ): Promise<InventoryCategoryResponseDto> {
    const category = await this.findActive(inventoryCategoryId);
    await this.assertNameIsFree(name, inventoryCategoryId);
    category.name = name;
    return this.toResponse(await this.categories.save(category));
  }

  // The items that use the category keep it: only the category leaves the
  // list the registration form offers.
  async remove(inventoryCategoryId: string): Promise<void> {
    const category = await this.findActive(inventoryCategoryId);
    category.deletedAt = new Date();
    await this.categories.save(category);
  }

  // The category an item is registered with; a removed one is not offered.
  async findActive(inventoryCategoryId: string): Promise<InventoryCategory> {
    const category = await this.categories.findOne({
      where: { inventoryCategoryId, deletedAt: IsNull() },
    });
    if (category === null) {
      throw new NotFoundException('Categoria não encontrada.');
    }
    return category;
  }

  // The database also refuses the duplicate (unique index), but a clear
  // message needs the check here first.
  private async assertNameIsFree(
    name: string,
    exceptCategoryId?: string,
  ): Promise<void> {
    const query = this.categories
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .andWhere('category.deleted_at IS NULL');
    if (exceptCategoryId !== undefined) {
      query.andWhere('category.inventory_category_id <> :exceptCategoryId', {
        exceptCategoryId,
      });
    }
    if (await query.getExists()) {
      throw new ConflictException(DUPLICATE_NAME_MESSAGE);
    }
  }

  private toResponse(category: InventoryCategory): InventoryCategoryResponseDto {
    return {
      inventoryCategoryId: category.inventoryCategoryId,
      name: category.name,
    };
  }
}
