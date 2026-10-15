import { CreateInventoryItemDto } from './create-inventory-item.dto';

export type UpdateInventoryItemDto = Partial<
  Pick<
    CreateInventoryItemDto,
    'name' | 'unit' | 'inventoryCategoryId' | 'supplierId' | 'minimumStock'
  >
>;
