import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { TrimString } from '../../common/trim-string';
import { MAX_PRICE_FACTOR, MAX_PRICE_PER_M2 } from '../../database/columns';
import {
  CATALOG_ITEM_NAME_MAX_LENGTH,
  CatalogItemType,
} from '../entities/catalog-item.entity';

// Decimal places of the columns: price_per_m2 is numeric(10,2) and
// price_factor is numeric(6,3).
export const PRICE_PER_M2_DECIMAL_PLACES = 2;
export const PRICE_FACTOR_DECIMAL_PLACES = 3;

export class CreateCatalogItemDto {
  @ApiProperty({ enum: CatalogItemType, example: CatalogItemType.PaintType })
  @IsEnum(CatalogItemType)
  type: CatalogItemType;

  @ApiProperty({ example: 'Epóxi', maxLength: CATALOG_ITEM_NAME_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATALOG_ITEM_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({
    example: 45.5,
    description: 'Preço por m² em reais. Só no tipo de pintura.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: PRICE_PER_M2_DECIMAL_PLACES })
  @IsPositive()
  @Max(MAX_PRICE_PER_M2)
  pricePerM2?: number;

  @ApiPropertyOptional({
    example: 1.2,
    description:
      'Fator que multiplica o preço por m². Só no material da peça (aço 1,0; alumínio 1,2).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: PRICE_FACTOR_DECIMAL_PLACES })
  @IsPositive()
  @Max(MAX_PRICE_FACTOR)
  priceFactor?: number;

  @ApiPropertyOptional({
    default: true,
    description: 'Inativo, o item some do simulador de orçamento.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
