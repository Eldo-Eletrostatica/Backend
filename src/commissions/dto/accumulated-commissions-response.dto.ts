import { ApiProperty } from '@nestjs/swagger';
import { CommissionSaleResponseDto } from './commission-sale-response.dto';

export class AccumulatedCommissionsResponseDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Identificador do vendedor',
  })
  employeeId: string;

  @ApiProperty({
    example: '2026-10-01',
    description: 'Data inicial do período consultado (YYYY-MM-DD)',
  })
  startDate: string;

  @ApiProperty({
    example: '2026-10-31',
    description: 'Data final do período consultado (YYYY-MM-DD)',
  })
  endDate: string;

  @ApiProperty({
    example: 350.75,
    description: 'Total acumulado de comissões no período em reais',
  })
  totalCommission: number;

  @ApiProperty({
    example: 7015.0,
    description: 'Valor total das vendas realizadas no período em reais',
  })
  totalSalesValue: number;

  @ApiProperty({
    example: 5,
    description: 'Quantidade de vendas realizadas no período',
  })
  salesCount: number;

  @ApiProperty({
    type: [CommissionSaleResponseDto],
    description: 'Lista discriminada das vendas realizadas no período',
  })
  sales: CommissionSaleResponseDto[];
}
