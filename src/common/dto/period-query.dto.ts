import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// The pattern limits the value to a day; the strict ISO 8601 check rejects
// days that do not exist, such as 2026-02-30.
const STRICT_DATE = { strict: true };

export class PeriodQueryDto {
  @ApiProperty({
    example: '2026-10-01',
    description: 'Data inicial do período no formato YYYY-MM-DD',
  })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'startDate deve estar no formato YYYY-MM-DD (ex: 2026-10-01)',
  })
  @IsDateString(STRICT_DATE, {
    message: 'startDate deve ser uma data existente',
  })
  startDate: string;

  @ApiProperty({
    example: '2026-10-31',
    description: 'Data final do período no formato YYYY-MM-DD',
  })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'endDate deve estar no formato YYYY-MM-DD (ex: 2026-10-31)',
  })
  @IsDateString(STRICT_DATE, {
    message: 'endDate deve ser uma data existente',
  })
  endDate: string;
}
