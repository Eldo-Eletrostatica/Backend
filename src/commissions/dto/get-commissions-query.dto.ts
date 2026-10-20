import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class GetCommissionsQueryDto {
  @ApiProperty({
    example: '2026-10-01',
    description: 'Data inicial do período no formato YYYY-MM-DD',
  })
  @Matches(DATE_REGEX, {
    message: 'startDate deve estar no formato YYYY-MM-DD (ex: 2026-10-01)',
  })
  startDate: string;

  @ApiProperty({
    example: '2026-10-31',
    description: 'Data final do período no formato YYYY-MM-DD',
  })
  @Matches(DATE_REGEX, {
    message: 'endDate deve estar no formato YYYY-MM-DD (ex: 2026-10-31)',
  })
  endDate: string;
}
