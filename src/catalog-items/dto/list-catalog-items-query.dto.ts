import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CatalogItemType } from '../entities/catalog-item.entity';

export class ListCatalogItemsQueryDto {
  @ApiPropertyOptional({ enum: CatalogItemType })
  @IsOptional()
  @IsEnum(CatalogItemType)
  type?: CatalogItemType;
}
