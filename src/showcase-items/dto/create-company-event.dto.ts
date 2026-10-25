import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TrimString } from '../../common/trim-string';
import {
  DATE_ONLY_PATTERN,
  TITLE_MAX_LENGTH,
} from '../showcase-items.constants';

// The image URL must come from the upload route; the service checks that.
export class CreateCompanyEventDto {
  @ApiProperty({ maxLength: TITLE_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  // Day the event happened; orders the timeline on the site.
  @ApiProperty({ example: '2026-09-12' })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'eventDate deve estar no formato YYYY-MM-DD (ex: 2026-09-12)',
  })
  @IsDateString({ strict: true })
  eventDate: string;
}
