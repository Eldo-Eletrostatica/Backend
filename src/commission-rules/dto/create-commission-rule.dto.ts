import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CommissionCalculationType,
  CommissionScope,
} from '../entities/commission-rule.entity';

const MONEY_DECIMAL_PLACES = 2;

export class CreateCommissionRuleDto {
  @ApiProperty({
    example: 'Comissão Padrão Até 5k',
    description: 'Nome identificador da regra de comissão',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Regra padrão percentual para vendas iniciais',
    description: 'Descrição ou justificativa da regra de comissão',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: CommissionCalculationType,
    example: CommissionCalculationType.Percentage,
    description: 'Tipo de cálculo: percentual ou valor fixo',
  })
  @IsEnum(CommissionCalculationType)
  calculationType: CommissionCalculationType;

  @ApiProperty({
    example: 5,
    description:
      'Valor da comissão: percentual (0.01 a 100) ou valor fixo em reais',
  })
  @IsNumber({ maxDecimalPlaces: MONEY_DECIMAL_PLACES })
  @IsPositive()
  @Type(() => Number)
  value: number;

  @ApiProperty({
    enum: CommissionScope,
    example: CommissionScope.Global,
    description: 'Escopo da regra: global ou para um funcionário específico',
  })
  @IsEnum(CommissionScope)
  scope: CommissionScope;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID do funcionário, obrigatório se o escopo for individual',
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Valor mínimo da venda para aplicação da faixa (inclusivo)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: MONEY_DECIMAL_PLACES })
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({
    example: 5000,
    description:
      'Valor máximo da venda para aplicação da faixa (inclusivo). Nulo ou ausente indica sem teto.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: MONEY_DECIMAL_PLACES })
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Indica se a regra está ativa',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
