import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EMAIL_MAX_LENGTH } from '../../database/columns';

export const PASSWORD_MAX_LENGTH = 128;

export class LoginDto {
  @ApiProperty({
    description: 'E-mail corporativo do funcionário',
    example: 'admin@eldo.com.br',
    maxLength: EMAIL_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({
    description: 'Senha de acesso',
    example: 'Senha@123',
  })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
