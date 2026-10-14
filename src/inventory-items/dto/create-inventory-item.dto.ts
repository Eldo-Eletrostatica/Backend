import { InventoryUnit } from '../entities/inventory-item.entity';

export interface CreateInventoryItemDto {
  name: string;
  unit: InventoryUnit;
  inventoryCategoryId: string;
  supplierId: string;
  balance?: number;
  minimumStock?: number;
}
