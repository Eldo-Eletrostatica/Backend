import { ApiPropertyOptional } from '@nestjs/swagger';
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

// Balance changes only through a stock movement, so it is not editable here.
export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_ITEM_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_CATEGORY_MAX_LENGTH)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(SUPPLIER_NAME_MAX_LENGTH)
  supplierName?: string;

  @ApiPropertyOptional({ enum: InventoryUnit })
  @IsOptional()
  @IsEnum(InventoryUnit)
  unit?: InventoryUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_STOCK_QUANTITY)
  minimumStock?: number;
}
