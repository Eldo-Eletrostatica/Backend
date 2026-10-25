import { ApiPropertyOptional } from '@nestjs/swagger';
import { CatalogItemType } from '../entities/catalog-item.entity';
import { IsNumber, IsPositive } from 'class-validator';

export class UpdateCatalogItemDto {
  @ApiPropertyOptional({
    example: 'paintType',
    description: 'Tipo de item: tinta ou material',
  })
  type: CatalogItemType;

  @ApiPropertyOptional({
    example: 'Azul Del Rey 10.006',
    description: 'Nome da tinta ou material',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Preco por metro quadrado para tintas',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  pricePerM2: number | null;

  @ApiPropertyOptional({
    description: 'Fator multiplicativo para materiais',
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  priceFactor: number | null;
}
