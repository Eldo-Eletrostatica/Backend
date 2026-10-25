import { ApiProperty } from '@nestjs/swagger';
import { CatalogItemType } from '../entities/catalog-item.entity';

export class CatalogItemResponseDto {
  @ApiProperty()
  catalogItemId: string;

  @ApiProperty({ enum: CatalogItemType })
  type: CatalogItemType;

  @ApiProperty({ example: 'Epóxi' })
  name: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 45.5,
    description: 'Preço por m²; null no material da peça',
  })
  pricePerM2: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null,
    description: 'Fator do material; null no tipo de pintura',
  })
  priceFactor: number | null;

  @ApiProperty()
  isActive: boolean;
}
