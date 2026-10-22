import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TITLE_MAX_LENGTH } from '../showcase-items.constants';
import { TrimString } from './trim-string.transform';

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
  @IsDateString({ strict: true })
  eventDate: string;
}
