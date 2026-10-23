import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH } from '../../auth/dto/login.dto';
import { EMAIL_MAX_LENGTH } from '../../database/columns';
import { EmployeeRole } from '../entities/employee.entity';
import {
  EMPLOYEE_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './create-employee.dto';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Nome completo do funcionário',
    example: 'Carlos Mendes',
    maxLength: EMPLOYEE_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'O nome não pode ser vazio.' })
  @MaxLength(EMPLOYEE_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    description: 'E-mail corporativo único entre funcionários ativos',
    example: 'carlos@eldo.com.br',
    maxLength: EMAIL_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email?: string;

  @ApiPropertyOptional({
    description: 'Nova senha de acesso (mínimo de 6 caracteres)',
    example: 'NovaSenha@123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password?: string;

  @ApiPropertyOptional({
    description: 'Nível de permissão do funcionário',
    enum: EmployeeRole,
    example: EmployeeRole.Manager,
  })
  @IsOptional()
  @IsEnum(EmployeeRole, {
    message: 'Nível de permissão inválido. Use admin, manager ou employee.',
  })
  role?: EmployeeRole;
}
