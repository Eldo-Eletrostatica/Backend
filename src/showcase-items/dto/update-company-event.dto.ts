import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsOmittable } from '../../common/is-omittable';
import { TrimString } from '../../common/trim-string';
import {
  DATE_ONLY_PATTERN,
  TITLE_MAX_LENGTH,
} from '../showcase-items.constants';

// Every column of an event is NOT NULL, so no field accepts null.
export class UpdateCompanyEventDto {
  @ApiPropertyOptional({ maxLength: TITLE_MAX_LENGTH })
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @IsNotEmpty()
  imageUrl?: string;

  @ApiPropertyOptional({ example: '2026-09-12' })
  @IsOmittable()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'eventDate deve estar no formato YYYY-MM-DD (ex: 2026-09-12)',
  })
  @IsDateString({ strict: true })
  eventDate?: string;
}
