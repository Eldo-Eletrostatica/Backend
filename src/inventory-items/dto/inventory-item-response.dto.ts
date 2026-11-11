import { ApiProperty } from '@nestjs/swagger';
import { InventoryUnit } from '../entities/inventory-item.entity';

export class InventoryItemResponseDto {
  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty({ example: 'Tinta epóxi preta' })
  name: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty({
    example: 'Tintas',
    description:
      'Nome da categoria. Se o administrador a removeu depois, o item continua mostrando o nome dela.',
  })
  category: string;

  @ApiProperty({ example: 'Tintas Brasil' })
  supplierName: string;

  @ApiProperty({ enum: InventoryUnit })
  unit: InventoryUnit;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  minimumStock: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InventoryItemCreatedResponseDto extends InventoryItemResponseDto {
  @ApiProperty({
    description: 'Já existe um item com esse nome, o que pode ser duplicidade',
  })
  hasPossibleDuplicate: boolean;
}
