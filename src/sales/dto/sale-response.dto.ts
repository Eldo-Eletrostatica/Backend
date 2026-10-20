import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../orders/entities/order.entity';

// Explicit response: returning the entity would drag in relations such as the
// seller, whose password hash must never leave the API.
export class SaleResponseDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  sellerEmployeeId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.Queued })
  status: OrderStatus;

  @ApiProperty({
    description: 'Protocolo que o cliente usa para consultar a OS (US19)',
  })
  trackingCode: string;

  @ApiProperty()
  finalPrice: number;

  @ApiProperty({ description: 'Comissão do vendedor, congelada no lançamento' })
  commission: number;

  @ApiProperty()
  soldAt: Date;

  @ApiProperty()
  scope: string;

  @ApiProperty({ example: '2030-01-15' })
  dueDate: string;
}
