import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsOmittable } from '../../common/is-omittable';
import { TrimString } from '../../common/trim-string';
import { MAX_STOCK_QUANTITY } from '../../database/columns';
import {
  INVENTORY_ITEM_NAME_MAX_LENGTH,
  InventoryUnit,
  SUPPLIER_NAME_MAX_LENGTH,
} from '../entities/inventory-item.entity';

// Balance changes only through a stock movement, so it is not editable here.
export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_ITEM_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    description: 'Categoria de estoque, da lista de /inventory-categories',
  })
  @IsOmittable()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SUPPLIER_NAME_MAX_LENGTH)
  supplierName?: string;

  @ApiPropertyOptional({ enum: InventoryUnit })
  @IsOmittable()
  @IsEnum(InventoryUnit)
  unit?: InventoryUnit;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_STOCK_QUANTITY)
  minimumStock?: number;
}
