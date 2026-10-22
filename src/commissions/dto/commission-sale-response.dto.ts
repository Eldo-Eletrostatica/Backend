import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../orders/entities/order.entity';

export class CommissionSaleResponseDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Identificador do pedido',
  })
  orderId: string;

  @ApiProperty({
    example: 'A7K9M2P4',
    description: 'Código de protocolo aleatório da OS',
  })
  trackingCode: string;

  @ApiProperty({
    example: '2026-10-15T14:30:00.000Z',
    description: 'Data e hora em que a venda foi lançada',
  })
  soldAt: Date;

  @ApiProperty({
    example: 1500.5,
    description: 'Valor final da venda em reais',
  })
  finalPrice: number;

  @ApiProperty({
    example: 75.0,
    description: 'Comissão congelada gerada pela venda',
  })
  commission: number;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.Queued,
    description: 'Status atual do pedido/OS',
  })
  status: OrderStatus;
}
