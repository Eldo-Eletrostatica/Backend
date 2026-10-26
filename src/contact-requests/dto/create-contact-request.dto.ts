import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../../common/trim-string';
import {
  CUSTOMER_NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
} from '../../customers/entities/customer.entity';
import { EMAIL_MAX_LENGTH } from '../../database/columns';

export const CONTACT_MESSAGE_MAX_LENGTH = 2000;

// Contact form of an individual customer (US06): no CPF, the team answers by
// WhatsApp.
export class CreateContactRequestDto {
  @ApiProperty({ example: 'Maria Souza', maxLength: CUSTOMER_NAME_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CUSTOMER_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ example: 'maria@email.com', maxLength: EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({ example: '61999999999', maxLength: PHONE_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PHONE_MAX_LENGTH)
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
