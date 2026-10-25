import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CUSTOMER_MESSAGE_MAX_LENGTH,
  DATE_ONLY_PATTERN,
} from './create-estimated-quote.dto';
import { QuoteCustomerDto } from './quote-customer.dto';

// Sent as multipart/form-data next to the file, so the customer fields are
// flat instead of nested.
export class CreatePdfQuoteDto extends QuoteCustomerDto {
  @ApiPropertyOptional({
    example: '2030-01-15',
    description: 'Prazo desejado (AAAA-MM-DD)',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'dueDate must be in the YYYY-MM-DD format',
  })
  @IsISO8601({ strict: true })
  dueDate?: string;

  @ApiPropertyOptional({ maxLength: CUSTOMER_MESSAGE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CUSTOMER_MESSAGE_MAX_LENGTH)
  message?: string;
}
