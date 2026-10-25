import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, Max, Min } from 'class-validator';
import { IsOmittable } from '../../common/is-omittable';
import { MAX_PERCENTAGE } from '../../database/columns';

// negotiation_margin is numeric(5,2).
const NEGOTIATION_MARGIN_DECIMAL_PLACES = 2;

export class UpdateEstimatorSettingsDto {
  @ApiPropertyOptional()
  @IsOmittable()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_PERCENTAGE, example: 15 })
  @IsOmittable()
  @IsNumber({ maxDecimalPlaces: NEGOTIATION_MARGIN_DECIMAL_PLACES })
  @Min(0)
  @Max(MAX_PERCENTAGE)
  negotiationMargin?: number;
}
