import { ApiProperty } from '@nestjs/swagger';
import { OrderSource, OrderStatus } from '../../orders/entities/order.entity';

export class QuoteResponseDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty({ description: 'Cliente achado pelo CNPJ ou cadastrado agora' })
  customerId: string;

  @ApiProperty({ enum: [OrderSource.Estimator, OrderSource.Pdf] })
  source: OrderSource;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.Requested })
  status: OrderStatus;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1200,
    description: 'Início da faixa de preço; null no orçamento por PDF',
  })
  minPrice: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1380,
    description:
      'Fim da faixa de preço, com a margem de negociação; null no orçamento por PDF',
  })
  maxPrice: number | null;
}
