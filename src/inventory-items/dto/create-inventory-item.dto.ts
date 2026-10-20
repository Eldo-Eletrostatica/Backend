import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
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
import { MAX_STOCK_QUANTITY } from '../../database/columns';
import {
  INVENTORY_CATEGORY_MAX_LENGTH,
  INVENTORY_ITEM_NAME_MAX_LENGTH,
  InventoryUnit,
  SUPPLIER_NAME_MAX_LENGTH,
} from '../entities/inventory-item.entity';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Tinta epóxi preta' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_ITEM_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    example: 'Tintas',
    description: 'Texto livre. A categoria não é uma tabela.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_CATEGORY_MAX_LENGTH)
  category: string;

  @ApiProperty({
    example: 'Tintas Brasil',
    description: 'Só o nome do fornecedor, gravado no próprio item.',
  })
  @Transform(trimString)
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
