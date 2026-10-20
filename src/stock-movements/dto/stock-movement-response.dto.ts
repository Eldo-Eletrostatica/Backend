import { ApiProperty } from '@nestjs/swagger';
import { InventoryUnit } from '../../inventory-items/entities/inventory-item.entity';
import { StockMovementType } from '../entities/stock-movement.entity';

class StockMovementItemDto {
  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: InventoryUnit })
  unit: InventoryUnit;
}

class StockMovementEmployeeDto {
  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  name: string;
}

export class StockMovementResponseDto {
  @ApiProperty()
  stockMovementId: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty({ enum: StockMovementType })
  type: StockMovementType;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  movedAt: Date;

  @ApiProperty({ type: StockMovementItemDto })
  inventoryItem: StockMovementItemDto;

  @ApiProperty({ type: StockMovementEmployeeDto })
  employee: StockMovementEmployeeDto;
}
