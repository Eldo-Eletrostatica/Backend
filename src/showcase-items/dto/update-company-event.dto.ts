import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TITLE_MAX_LENGTH } from '../showcase-items.constants';
import { IsOmittable } from './is-omittable';
import { TrimString } from './trim-string.transform';

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
  @IsDateString({ strict: true })
  eventDate?: string;
}
