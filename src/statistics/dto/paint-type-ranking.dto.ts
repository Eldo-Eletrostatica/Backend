import { ApiProperty } from '@nestjs/swagger';

export class PaintTypeRankingDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  catalogItemId: string;

  @ApiProperty({ example: 'Epóxi' })
  name: string;

  @ApiProperty({
    example: 15,
    description: 'Quantidade de pedidos do período que pediram esta pintura',
  })
  orderCount: number;
}
