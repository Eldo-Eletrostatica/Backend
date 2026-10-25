import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OrderItemDto } from '../../common/dto/order-item.dto';
import { QuoteCustomerDto } from './quote-customer.dto';

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const CUSTOMER_MESSAGE_MAX_LENGTH = 2000;

export class CreateEstimatedQuoteDto {
  @ApiProperty({ type: QuoteCustomerDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => QuoteCustomerDto)
  customer: QuoteCustomerDto;

  @ApiProperty({
    type: [OrderItemDto],
    description: 'Peças do projeto. O preço vem do catálogo, nunca do pedido.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    example: '2030-01-15',
    description: 'Prazo desejado (AAAA-MM-DD)',
  })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'dueDate must be in the YYYY-MM-DD format',
  })
  @IsISO8601({ strict: true })
  dueDate: string;

  @ApiPropertyOptional({ maxLength: CUSTOMER_MESSAGE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CUSTOMER_MESSAGE_MAX_LENGTH)
  message?: string;
}
