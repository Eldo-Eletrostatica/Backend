import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimString } from '../../common/trim-string';
import { MAX_STOCK_QUANTITY } from '../../database/columns';
import {
  INVENTORY_CATEGORY_MAX_LENGTH,
  INVENTORY_ITEM_NAME_MAX_LENGTH,
  InventoryUnit,
  SUPPLIER_NAME_MAX_LENGTH,
} from '../entities/inventory-item.entity';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Tinta epóxi preta' })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_ITEM_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    example: 'Tintas',
    description: 'Texto livre. A categoria não é uma tabela.',
  })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_CATEGORY_MAX_LENGTH)
  category: string;

  @ApiProperty({
    example: 'Tintas Brasil',
    description: 'Só o nome do fornecedor, gravado no próprio item.',
  })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SUPPLIER_NAME_MAX_LENGTH)
  supplierName: string;

  @ApiProperty({ enum: InventoryUnit, example: InventoryUnit.Liter })
  @IsEnum(InventoryUnit)
  unit: InventoryUnit;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_STOCK_QUANTITY)
  balance?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_STOCK_QUANTITY)
  minimumStock?: number;
}
