import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CATEGORY_MAX_LENGTH,
  MATERIALS_MAX_LENGTH,
  SERVICE_TYPE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../showcase-items.constants';
import { IsOmittable } from '../../common/is-omittable';
import { TrimString } from '../../common/trim-string';

export class UpdatePortfolioProjectDto {
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

  // The cover is required in the table, so it cannot be null.
  @ApiPropertyOptional()
  @IsOmittable()
  @IsString()
  @IsNotEmpty()
  imageUrl?: string;

  @ApiPropertyOptional({ maxLength: CATEGORY_MAX_LENGTH })
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_MAX_LENGTH)
  category?: string;

  @ApiPropertyOptional({ maxLength: SERVICE_TYPE_MAX_LENGTH })
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SERVICE_TYPE_MAX_LENGTH)
  serviceType?: string;

  @ApiPropertyOptional({ maxLength: MATERIALS_MAX_LENGTH })
  @IsOmittable()
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MATERIALS_MAX_LENGTH)
  materials?: string;

  // Only the before/after photos accept null, to remove the picture.
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  beforeUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  afterUrl?: string | null;
}
