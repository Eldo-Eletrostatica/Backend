import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  CUSTOMER_NAME_MAX_LENGTH,
  CustomerType,
  PHONE_MAX_LENGTH,
} from '../../customers/entities/customer.entity';
import { EMAIL_MAX_LENGTH } from '../../database/columns';

// CPF has 11 digits and CNPJ has 14, both without punctuation.
const DOCUMENT_PATTERN = /^(\d{11}|\d{14})$/;

export class SaleCustomerDto {
  @ApiProperty({ enum: CustomerType })
  @IsEnum(CustomerType)
  type: CustomerType;

  @ApiProperty({ maxLength: CUSTOMER_NAME_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CUSTOMER_NAME_MAX_LENGTH)
  name: string;

  // Required for a business customer; an individual may have none yet.
  @ApiPropertyOptional({ description: 'CPF ou CNPJ, só dígitos' })
  @ValidateIf(
    (customer: SaleCustomerDto) =>
      customer.type === CustomerType.Business ||
      customer.document !== undefined,
  )
  @Matches(DOCUMENT_PATTERN, {
    message: 'document must be a CPF (11 digits) or a CNPJ (14 digits)',
  })
  document?: string;

  @ApiProperty({ maxLength: EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({ maxLength: PHONE_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PHONE_MAX_LENGTH)
  phone: string;
}
