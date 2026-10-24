import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { OrderStatus, SALE_STATUSES } from '../../orders/entities/order.entity';

export class UpdateServiceOrderStatusDto {
  @ApiProperty({ enum: SALE_STATUSES, example: OrderStatus.InProduction })
  @IsIn(SALE_STATUSES)
  status: OrderStatus;
}
