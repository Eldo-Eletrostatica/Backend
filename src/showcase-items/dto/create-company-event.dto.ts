import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { TITLE_MAX_LENGTH } from '../showcase-items.constants';

export class CreateCompanyEventDto {
  @ApiProperty({ maxLength: TITLE_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  // Only the URL is received until the StorageService is integrated.
  @ApiProperty()
  @IsUrl()
  imageUrl: string;

  // Day the event happened; orders the timeline on the site.
  @ApiProperty({ example: '2026-09-12' })
  @IsDateString({ strict: true })
  eventDate: string;
}
