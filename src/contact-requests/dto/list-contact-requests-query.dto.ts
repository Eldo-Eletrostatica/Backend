import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';
import { CONTACT_REQUEST_STATUSES } from '../contact-request-status';

export class ListContactRequestsQueryDto {
  @ApiPropertyOptional({
    enum: CONTACT_REQUEST_STATUSES,
    description: 'requested (novo) ou handled (atendido)',
  })
  @IsOptional()
  @IsIn(CONTACT_REQUEST_STATUSES)
  status?: OrderStatus;
}
