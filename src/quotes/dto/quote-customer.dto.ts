import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TrimString } from '../../common/trim-string';
import {
  CUSTOMER_NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
} from '../../customers/entities/customer.entity';
import { EMAIL_MAX_LENGTH } from '../../database/columns';

// 14 digits, without punctuation.
const CNPJ_PATTERN = /^\d{14}$/;

// The quote form is for business customers (US07): the CNPJ identifies them.
export class QuoteCustomerDto {
  @ApiProperty({
    example: 'Metalúrgica Exemplo Ltda',
    maxLength: CUSTOMER_NAME_MAX_LENGTH,
  })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CUSTOMER_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ example: '12345678000199', description: 'Só dígitos' })
  @Matches(CNPJ_PATTERN, { message: 'cnpj must have 14 digits' })
  cnpj: string;

  @ApiProperty({ maxLength: EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({ example: '61999999999', maxLength: PHONE_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PHONE_MAX_LENGTH)
  phone: string;
}
