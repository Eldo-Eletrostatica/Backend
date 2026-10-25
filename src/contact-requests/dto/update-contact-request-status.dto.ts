import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';
import { CONTACT_REQUEST_STATUSES } from '../contact-request-status';

export class UpdateContactRequestStatusDto {
  @ApiProperty({
    enum: CONTACT_REQUEST_STATUSES,
    example: OrderStatus.Handled,
    description: 'handled marca como atendido; requested desfaz a marcação',
  })
  @IsIn(CONTACT_REQUEST_STATUSES)
  status: OrderStatus;
}
