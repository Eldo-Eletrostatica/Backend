import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PeriodQueryDto } from '../../common/dto/period-query.dto';

export enum ExportFormat {
  Pdf = 'pdf',
  Xlsx = 'xlsx',
}

export class ExportStatisticsQueryDto extends PeriodQueryDto {
  @ApiProperty({
    enum: ExportFormat,
    example: ExportFormat.Pdf,
    description: 'Formato do arquivo: pdf ou xlsx (planilha do Excel)',
  })
  @IsEnum(ExportFormat, { message: 'format deve ser pdf ou xlsx' })
  format: ExportFormat;
}
