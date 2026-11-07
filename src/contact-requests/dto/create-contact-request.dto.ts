import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../../common/trim-string';
import {
  CUSTOMER_NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
} from '../../customers/entities/customer.entity';
import { EMAIL_MAX_LENGTH } from '../../database/columns';
import { IsBrazilianPhone, IsPersonName } from '../../common/contact-fields';

export const CONTACT_MESSAGE_MAX_LENGTH = 2000;

// Contact form of an individual customer (US06): no CPF, the team answers by
// WhatsApp.
export class CreateContactRequestDto {
  @ApiProperty({ example: 'Maria Souza', maxLength: CUSTOMER_NAME_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CUSTOMER_NAME_MAX_LENGTH)
  @IsPersonName()
  name: string;

  @ApiProperty({ example: 'maria@email.com', maxLength: EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({
    example: '61999999999',
    description:
      'Só dígitos, com DDD: 10 (fixo) ou 11 (celular, começando por 9)',
    maxLength: PHONE_MAX_LENGTH,
  })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PHONE_MAX_LENGTH)
  @IsBrazilianPhone()
  phone: string;

  @ApiProperty({
    example: 'Quero pintar o portão de casa.',
    maxLength: CONTACT_MESSAGE_MAX_LENGTH,
  })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTACT_MESSAGE_MAX_LENGTH)
  message: string;
}
