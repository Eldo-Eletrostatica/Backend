import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../orders/entities/order.entity';

// Public lookup by tracking code: nothing beyond the progress of this order.
export class ServiceOrderTrackingDto {
  @ApiProperty()
  trackingCode: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ example: '2030-01-15' })
  dueDate: string;
}

// Public lookup by CNPJ: stage and due date of each order still in progress.
export class ServiceOrderProgressDto {
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ example: '2030-01-15' })
  dueDate: string;
}
