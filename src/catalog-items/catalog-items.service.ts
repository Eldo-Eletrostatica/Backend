import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { findPriceProblem } from './catalog-item-price';
import { CatalogItemResponseDto } from './dto/catalog-item-response.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { ListCatalogItemsQueryDto } from './dto/list-catalog-items-query.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CatalogItem } from './entities/catalog-item.entity';

export const CATALOG_ITEM_NOT_FOUND_MESSAGE =
  'Item do catálogo não encontrado.';

@Injectable()
export class CatalogItemsService {
  constructor(
    @InjectRepository(CatalogItem)
    private readonly catalogItemRepository: Repository<CatalogItem>,
  ) {}

  // The admin list shows inactive items too, so they can be turned back on.
  async findAll(
    query: ListCatalogItemsQueryDto,
  ): Promise<CatalogItemResponseDto[]> {
    const catalogItems = await this.catalogItemRepository.find({
      where: { type: query.type },
      order: { type: 'ASC', name: 'ASC' },
    });
    return catalogItems.map(toResponse);
  }

  async create(dto: CreateCatalogItemDto): Promise<CatalogItemResponseDto> {
    const pricePerM2 = dto.pricePerM2 ?? null;
    const priceFactor = dto.priceFactor ?? null;
    assertPricesFitType(dto.type, pricePerM2, priceFactor);

    const catalogItem = await this.catalogItemRepository.save(
      this.catalogItemRepository.create({
        type: dto.type,
        name: dto.name,
        pricePerM2,
        priceFactor,
        isActive: dto.isActive ?? true,
      }),
    );
    return toResponse(catalogItem);
  }

  async update(
    catalogItemId: string,
    dto: UpdateCatalogItemDto,
  ): Promise<CatalogItemResponseDto> {
    const catalogItem = await this.findOneOrFail(catalogItemId);
    // Field by field: the DTO class declares every field, so a field left out
    // of the request is undefined and Object.assign would copy it.
    if (dto.name !== undefined) catalogItem.name = dto.name;
    if (dto.pricePerM2 !== undefined) catalogItem.pricePerM2 = dto.pricePerM2;
    if (dto.priceFactor !== undefined)
      catalogItem.priceFactor = dto.priceFactor;
    if (dto.isActive !== undefined) catalogItem.isActive = dto.isActive;
    assertPricesFitType(
      catalogItem.type,
      catalogItem.pricePerM2,
      catalogItem.priceFactor,
    );

    return toResponse(await this.catalogItemRepository.save(catalogItem));
  }

  // Soft delete (ADR 0002): the orders that used the item keep pointing to it.
  async remove(catalogItemId: string): Promise<void> {
    const catalogItem = await this.findOneOrFail(catalogItemId);
    await this.catalogItemRepository.softRemove(catalogItem);
  }

  private async findOneOrFail(catalogItemId: string): Promise<CatalogItem> {
    const catalogItem = await this.catalogItemRepository.findOne({
      where: { catalogItemId },
    });
    if (catalogItem === null) {
      throw new NotFoundException(CATALOG_ITEM_NOT_FOUND_MESSAGE);
    }
    return catalogItem;
  }
}

function assertPricesFitType(
  ...args: Parameters<typeof findPriceProblem>
): void {
  const problem = findPriceProblem(...args);
  if (problem !== null) {
    throw new BadRequestException(problem);
  }
}

function toResponse(catalogItem: CatalogItem): CatalogItemResponseDto {
  return {
    catalogItemId: catalogItem.catalogItemId,
    type: catalogItem.type,
    name: catalogItem.name,
    pricePerM2: catalogItem.pricePerM2,
    priceFactor: catalogItem.priceFactor,
    isActive: catalogItem.isActive,
  };
}
