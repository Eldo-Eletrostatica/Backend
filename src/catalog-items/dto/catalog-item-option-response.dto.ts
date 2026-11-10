import { ApiProperty } from '@nestjs/swagger';
import { CatalogItemType } from '../entities/catalog-item.entity';

// Minimal catalog data for the selector on the sales screen (US21). Prices are
// intentionally left out: the seller picks the item, the sale calculates it.
export class CatalogItemOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  catalogItemId: string;

  @ApiProperty({ enum: CatalogItemType })
  type: CatalogItemType;

  @ApiProperty({ example: 'Epóxi' })
  name: string;
}
