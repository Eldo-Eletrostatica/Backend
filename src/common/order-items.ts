import { UnprocessableEntityException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import {
  CatalogItem,
  CatalogItemType,
} from '../catalog-items/entities/catalog-item.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderItemDto } from './dto/order-item.dto';

export const INVALID_PAINT_TYPE_MESSAGE =
  'Tipo de pintura inexistente, desativado ou de outro tipo.';
export const INVALID_PART_MATERIAL_MESSAGE =
  'Material da peça inexistente, desativado ou de outro tipo.';

// Both foreign keys point to catalog_items, so the database cannot tell a
// paint type from a material: the type is checked here. The prices are copied
// into the item and stay frozen (ADR 0003). The items still have no orderId:
// the caller sets it once the order is saved.
export async function buildOrderItems(
  manager: EntityManager,
  items: OrderItemDto[],
): Promise<OrderItem[]> {
  const catalogItemIds = items.flatMap((item) => [
    item.materialCatalogItemId,
    item.paintCatalogItemId,
  ]);
  const catalogItems = await manager.find(CatalogItem, {
    where: { catalogItemId: In(catalogItemIds), isActive: true },
  });
  const catalogItemById = new Map(
    catalogItems.map((catalogItem) => [catalogItem.catalogItemId, catalogItem]),
  );

  return items.map((item) => {
    const paint = catalogItemById.get(item.paintCatalogItemId);
    const material = catalogItemById.get(item.materialCatalogItemId);
    if (
      paint?.type !== CatalogItemType.PaintType ||
      paint.pricePerM2 === null
    ) {
      throw new UnprocessableEntityException(INVALID_PAINT_TYPE_MESSAGE);
    }
    if (
      material?.type !== CatalogItemType.PartMaterial ||
      material.priceFactor === null
    ) {
      throw new UnprocessableEntityException(INVALID_PART_MATERIAL_MESSAGE);
    }
    return manager.create(OrderItem, {
      materialCatalogItemId: item.materialCatalogItemId,
      paintCatalogItemId: item.paintCatalogItemId,
      areaM2: item.areaM2,
      quantity: item.quantity,
      pricePerM2: paint.pricePerM2,
      priceFactor: material.priceFactor,
    });
  });
}
