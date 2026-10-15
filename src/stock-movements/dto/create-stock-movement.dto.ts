import { StockMovementType } from '../entities/stock-movement.entity';

export interface CreateStockMovementDto {
  inventoryItemId: string;
  employeeId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
}
