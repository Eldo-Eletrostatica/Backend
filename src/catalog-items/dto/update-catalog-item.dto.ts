import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { IsOmittable } from '../../common/is-omittable';
import { TrimString } from '../../common/trim-string';
import { MAX_PRICE_FACTOR, MAX_PRICE_PER_M2 } from '../../database/columns';
import { CATALOG_ITEM_NAME_MAX_LENGTH } from '../entities/catalog-item.entity';
import {
  PRICE_FACTOR_DECIMAL_PLACES,
  PRICE_PER_M2_DECIMAL_PLACES,
} from './create-catalog-item.dto';

// The type is left out on purpose: a paint type does not become a material.
// A new price only reaches new quotes; the old ones keep the price they copied
// (ADR 0003).
export class UpdateCatalogItemDto {
  @ApiPropertyOptional({ maxLength: CATALOG_ITEM_NAME_MAX_LENGTH })
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATALOG_ITEM_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ description: 'Só no tipo de pintura' })
  @IsOmittable()
  @IsNumber({ maxDecimalPlaces: PRICE_PER_M2_DECIMAL_PLACES })
  @IsPositive()
  @Max(MAX_PRICE_PER_M2)
  pricePerM2?: number;

  @ApiPropertyOptional({ description: 'Só no material da peça' })
  @IsOmittable()
  @IsNumber({ maxDecimalPlaces: PRICE_FACTOR_DECIMAL_PLACES })
  @IsPositive()
  @Max(MAX_PRICE_FACTOR)
  priceFactor?: number;

  @ApiPropertyOptional({
    description: 'false tira o item do simulador; true devolve.',
  })
  @IsOmittable()
  @IsBoolean()
  isActive?: boolean;
}
