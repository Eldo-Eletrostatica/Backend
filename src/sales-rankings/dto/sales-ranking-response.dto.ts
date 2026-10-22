import { ApiProperty } from '@nestjs/swagger';
import { SalesRankingOrderBy } from './get-sales-ranking-query.dto';

export class SalesRankingPeriodDto {
  @ApiProperty({ example: '2026-10-01' })
  startDate: string;

  @ApiProperty({ example: '2026-10-31' })
  endDate: string;

  @ApiProperty({
    enum: SalesRankingOrderBy,
    example: SalesRankingOrderBy.Value,
  })
  orderBy: SalesRankingOrderBy;
}

export class SalesRankingItemDto {
  @ApiProperty({ example: 1, description: 'Posição no ranking' })
  position: number;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  employeeId: string;

  @ApiProperty({ example: 'Mariana Lima' })
  name: string;

  @ApiProperty({ example: 'mariana@eldo.com.br' })
  email: string;

  @ApiProperty({
    example: 12,
    description: 'Quantidade total de vendas realizadas no período',
  })
  salesCount: number;

  @ApiProperty({
    example: 45000.0,
    description: 'Valor total vendido no período em R$',
  })
  totalSalesValue: number;

  @ApiProperty({
    example: 3750.0,
    description: 'Ticket médio das vendas no período em R$',
  })
  averageTicket: number;
}

export class SalesRankingResponseDto {
  @ApiProperty({ type: SalesRankingPeriodDto })
  period: SalesRankingPeriodDto;

  @ApiProperty({ type: [SalesRankingItemDto] })
  ranking: SalesRankingItemDto[];
}
