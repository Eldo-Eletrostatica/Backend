import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, ValidateIf } from 'class-validator';
import { CommissionType } from '../../employees/entities/employee.entity';

const MONEY_DECIMAL_PLACES = 2;

export class UpdateCommissionRuleDto {
  @ApiPropertyOptional({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.Percentage,
    description:
      'Commission calculation type (percentage or fixed); null to clear rule',
  })
  @ValidateIf((_, value) => value !== null)
  @IsEnum(CommissionType)
  commissionType: CommissionType | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 5,
    description:
      'Commission value (percentage 0.01-100 or fixed amount in BRL); null to clear rule',
  })
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: MONEY_DECIMAL_PLACES })
  @Type(() => Number)
  commissionValue: number | null;
}
