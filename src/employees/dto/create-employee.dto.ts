import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH } from '../../auth/dto/login.dto';
import { TrimString } from '../../common/trim-string';
import {
  EMAIL_MAX_LENGTH,
  EMPLOYEE_NAME_MAX_LENGTH,
} from '../../database/columns';
import { EmployeeRole } from '../entities/employee.entity';

export const PASSWORD_MIN_LENGTH = 6;

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Nome completo do funcionário',
    example: 'Carlos Mendes',
    maxLength: EMPLOYEE_NAME_MAX_LENGTH,
  })
  @TrimString()
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(EMPLOYEE_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    description: 'E-mail corporativo único entre funcionários ativos',
    example: 'carlos@eldo.com.br',
    maxLength: EMAIL_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({
    description: 'Senha inicial de acesso (mínimo de 6 caracteres)',
    example: 'Senha@123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

  @ApiProperty({
    description: 'Nível de permissão do funcionário',
    enum: EmployeeRole,
    example: EmployeeRole.Employee,
  })
  @IsEnum(EmployeeRole, {
    message: 'Nível de permissão inválido. Use admin, manager ou employee.',
  })
  role: EmployeeRole;
}
