import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, Max, ValidateIf } from 'class-validator';
import { CommissionType } from '../../employees/entities/employee.entity';

const MONEY_DECIMAL_PLACES = 2;

// commissionValue is numeric(12,2).
export const MAX_COMMISSION_VALUE = 9_999_999_999.99;

export class UpdateCommissionRuleDto {
  @ApiPropertyOptional({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.Percentage,
    description:
      'Tipo de cálculo da comissão: percentual ou valor fixo; nulo para remover a regra',
  })
  @ValidateIf((_, value) => value !== null)
  @IsEnum(CommissionType)
  commissionType: CommissionType | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 5,
    description:
      'Valor da comissão: percentual (0,01 a 100) ou valor fixo em reais; nulo para remover a regra',
  })
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: MONEY_DECIMAL_PLACES })
  @Max(MAX_COMMISSION_VALUE)
  @Type(() => Number)
  commissionValue: number | null;
}
