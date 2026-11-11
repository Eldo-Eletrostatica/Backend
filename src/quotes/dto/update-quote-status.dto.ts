import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, Max } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';

// finalPrice is numeric(12,2).
export const MAX_QUOTE_VALUE = 9_999_999_999.99;
const MONEY_DECIMAL_PLACES = 2;

export const QUOTE_NEXT_STATUSES = [
  OrderStatus.Sent,
  OrderStatus.Approved,
  OrderStatus.Rejected,
];

export class UpdateQuoteStatusDto {
  @ApiProperty({
    enum: QUOTE_NEXT_STATUSES,
    example: OrderStatus.Sent,
    description:
      'sent: a Eldo enviou o valor; approved: o cliente aprovou; rejected: o cliente recusou',
  })
  @IsIn(QUOTE_NEXT_STATUSES)
  status: OrderStatus;

  @ApiPropertyOptional({
    example: 1500,
    description: 'Valor enviado ao cliente em reais; obrigatório só com sent',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: MONEY_DECIMAL_PLACES })
  @IsPositive()
  @Max(MAX_QUOTE_VALUE)
  finalPrice?: number;
}
