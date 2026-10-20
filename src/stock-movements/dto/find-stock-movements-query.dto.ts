import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FindStockMovementsQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'from must be in the YYYY-MM-DD format',
  })
  @IsISO8601({ strict: true })
  from: string;

  @ApiProperty({ example: '2026-01-31' })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'to must be in the YYYY-MM-DD format',
  })
  @IsISO8601({ strict: true })
  to: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;
}
