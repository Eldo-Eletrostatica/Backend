import { ApiProperty } from '@nestjs/swagger';

export class InventoryCategoryResponseDto {
  @ApiProperty()
  inventoryCategoryId: string;

  @ApiProperty({ example: 'Tintas' })
  name: string;
}
