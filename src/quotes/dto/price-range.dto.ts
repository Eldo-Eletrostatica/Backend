import { ApiProperty } from '@nestjs/swagger';

export class PriceRangeDto {
  @ApiProperty({ example: 1200, description: 'Preço calculado' })
  minPrice: number;

  @ApiProperty({
    example: 1380,
    description: 'Preço calculado mais a margem de negociação',
  })
  maxPrice: number;
}
