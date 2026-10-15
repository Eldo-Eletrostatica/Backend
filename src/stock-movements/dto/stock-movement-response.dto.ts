import { InventoryUnit } from '../../inventory-items/entities/inventory-item.entity';
import { StockMovementType } from '../entities/stock-movement.entity';

export interface StockMovementResponseDto {
  stockMovementId: string;
  inventoryItemId: string;
  employeeId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  movedAt: Date;
  inventoryItem: {
    inventoryItemId: string;
    name: string;
    unit: InventoryUnit;
  };
  employee: {
    employeeId: string;
    name: string;
  };
}
