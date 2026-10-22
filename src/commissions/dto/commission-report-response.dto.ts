import { ApiProperty } from '@nestjs/swagger';
import { CommissionType } from '../../employees/entities/employee.entity';

export class CommissionReportPeriodDto {
  @ApiProperty({ example: '2026-10-01' })
  startDate: string;

  @ApiProperty({ example: '2026-10-31' })
  endDate: string;
}

export class CommissionReportSummaryDto {
  @ApiProperty({
    example: 450.75,
    description: 'Total de comissões no período em R$',
  })
  totalCommission: number;

  @ApiProperty({
    example: 15000.5,
    description: 'Valor total de vendas no período em R$',
  })
  totalSalesValue: number;

  @ApiProperty({
    example: 8,
    description: 'Quantidade total de vendas no período',
  })
  totalSalesCount: number;

  @ApiProperty({
    example: 3,
    description: 'Quantidade de funcionários listados no relatório',
  })
  sellersCount: number;
}

export class CommissionReportEmployeeDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  employeeId: string;

  @ApiProperty({ example: 'Carlos Vendedor' })
  name: string;

  @ApiProperty({ example: 'carlos@eldo.com.br' })
  email: string;

  @ApiProperty({
    example: 5,
    description: 'Quantidade de vendas do vendedor no período',
  })
  salesCount: number;

  @ApiProperty({ example: 10000.0, description: 'Valor total de vendas em R$' })
  totalSalesValue: number;

  @ApiProperty({
    example: 300.5,
    description: 'Total de comissão devida em R$',
  })
  totalCommission: number;

  @ApiProperty({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.Percentage,
  })
  commissionType: CommissionType | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    example: 3.0,
    description: 'Percentual ou valor fixo em R$ da regra de comissão',
  })
  commissionValue: number | null;

  @ApiProperty({
    example: false,
    description: 'Indica se o funcionário está excluído logicamente',
  })
  isDeleted: boolean;
}

export class CommissionReportResponseDto {
  @ApiProperty({ type: CommissionReportPeriodDto })
  period: CommissionReportPeriodDto;

  @ApiProperty({ type: CommissionReportSummaryDto })
  summary: CommissionReportSummaryDto;

  @ApiProperty({ type: [CommissionReportEmployeeDto] })
  employees: CommissionReportEmployeeDto[];
}
