import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CATEGORY_MAX_LENGTH,
  MATERIALS_MAX_LENGTH,
  SERVICE_TYPE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../showcase-items.constants';
import { TrimString } from '../../common/trim-string';

export class CreatePortfolioProjectDto {
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

  @ApiProperty({ maxLength: CATEGORY_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_MAX_LENGTH)
  category: string;

  @ApiProperty({ maxLength: SERVICE_TYPE_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SERVICE_TYPE_MAX_LENGTH)
  serviceType: string;

  @ApiProperty({ maxLength: MATERIALS_MAX_LENGTH })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MATERIALS_MAX_LENGTH)
  materials: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beforeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  afterUrl?: string;
}
