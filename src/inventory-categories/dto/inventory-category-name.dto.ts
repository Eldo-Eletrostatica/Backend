import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../../common/trim-string';
import { INVENTORY_CATEGORY_NAME_MAX_LENGTH } from '../entities/inventory-category.entity';

// Same body to create and to rename a category.
export class InventoryCategoryNameDto {
  @ApiProperty({ example: 'Tintas' })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(INVENTORY_CATEGORY_NAME_MAX_LENGTH)
  name: string;
}
