import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsOmittable } from '../../common/is-omittable';
import {
  DESCRIPTION_MAX_LENGTH,
  EYEBROW_MAX_LENGTH,
  HEX_COLOR_PATTERN,
  HIGHLIGHT_MAX_LENGTH,
  LOGO_TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  VisualSettingsPatch,
} from '../visual-settings';

// Text and colors may be left out of the PATCH but never cleared; only the
// images accept null.

const HEX_COLOR_MESSAGE = '$property must be a hex color such as #e9b421';

class ColorsPatchDto {
  @ApiPropertyOptional({ example: '#e9b421' })
  @IsOmittable()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  accent?: string;

  @ApiPropertyOptional({ example: '#12100d' })
  @IsOmittable()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  pageBackground?: string;

  @ApiPropertyOptional({ example: '#171511' })
  @IsOmittable()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  cardBackground?: string;

  @ApiPropertyOptional({ example: '#f5f2ec' })
  @IsOmittable()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  text?: string;
}

class LogoPatchDto {
  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(LOGO_TEXT_MAX_LENGTH)
  text?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

class BannerPatchDto {
  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(EYEBROW_MAX_LENGTH)
  eyebrow?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(HIGHLIGHT_MAX_LENGTH)
  highlight?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

class SectionTitlesPatchDto {
  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(TITLE_MAX_LENGTH)
  portfolio?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(TITLE_MAX_LENGTH)
  reviews?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(TITLE_MAX_LENGTH)
  contact?: string;
}

class EventsHeaderPatchDto {
  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(EYEBROW_MAX_LENGTH)
  eyebrow?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;
}

export class UpdateVisualSettingsDto implements VisualSettingsPatch {
  @ApiPropertyOptional({ type: ColorsPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ColorsPatchDto)
  colors?: ColorsPatchDto;

  @ApiPropertyOptional({ type: LogoPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LogoPatchDto)
  logo?: LogoPatchDto;

  @ApiPropertyOptional({ type: BannerPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BannerPatchDto)
  banner?: BannerPatchDto;

  @ApiPropertyOptional({ type: SectionTitlesPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SectionTitlesPatchDto)
  sectionTitles?: SectionTitlesPatchDto;

  @ApiPropertyOptional({ type: EventsHeaderPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventsHeaderPatchDto)
  eventsHeader?: EventsHeaderPatchDto;
}
