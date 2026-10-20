import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommissionCalculationType,
  CommissionScope,
} from '../entities/commission-rule.entity';

export class CommissionRuleResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  commissionRuleId: string;

  @ApiProperty({ example: 'Comissão Padrão Até 5k' })
  name: string;

  @ApiPropertyOptional({
    example: 'Regra padrão percentual para vendas iniciais',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ enum: CommissionCalculationType })
  calculationType: CommissionCalculationType;

  @ApiProperty({ example: 5 })
  value: number;

  @ApiProperty({ enum: CommissionScope })
  scope: CommissionScope;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    nullable: true,
  })
  employeeId: string | null;

  @ApiProperty({ example: 0 })
  minAmount: number;

  @ApiPropertyOptional({ example: 5000, nullable: true })
  maxAmount: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-10-20T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-20T10:00:00.000Z' })
  updatedAt: Date;
}
