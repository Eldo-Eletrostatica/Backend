import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, IsUUID, Max } from 'class-validator';

// Limits of the columns: area is numeric(10,3) and quantity is a 32-bit integer.
export const MAX_AREA_M2 = 9_999_999.999;
export const MAX_ITEM_QUANTITY = 2_147_483_647;
const AREA_DECIMAL_PLACES = 3;

export class SaleItemDto {
  @ApiProperty({ description: 'Item do catálogo do tipo partMaterial' })
  @IsUUID()
  materialCatalogItemId: string;

  @ApiProperty({ description: 'Item do catálogo do tipo paintType' })
  @IsUUID()
  paintCatalogItemId: string;

  @ApiProperty({ description: 'Área em m² de uma peça' })
  @IsNumber({ maxDecimalPlaces: AREA_DECIMAL_PLACES })
  @IsPositive()
  @Max(MAX_AREA_M2)
  areaM2: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  @Max(MAX_ITEM_QUANTITY)
  quantity: number;
}
