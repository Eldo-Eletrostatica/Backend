import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../../common/trim-string';
import { CATEGORY_MAX_LENGTH } from '../showcase-items.constants';

export class RenamePortfolioCategoryDto {
  @ApiProperty({
    maxLength: CATEGORY_MAX_LENGTH,
    example: 'Estrutura Metálica',
  })
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_MAX_LENGTH)
  name: string;
}
