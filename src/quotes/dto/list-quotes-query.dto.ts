import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';
import { QUOTE_STATUSES } from '../quote-status';

export class ListQuotesQueryDto {
  @ApiPropertyOptional({
    enum: QUOTE_STATUSES,
    description:
      'requested, sent, approved ou rejected; sem filtro lista todos',
  })
  @IsOptional()
  @IsIn(QUOTE_STATUSES)
  status?: OrderStatus;
}
