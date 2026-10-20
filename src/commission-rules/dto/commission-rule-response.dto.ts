import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionType } from '../../employees/entities/employee.entity';

export class CommissionRuleResponseDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Unique identifier of the employee',
  })
  employeeId: string;

  @ApiPropertyOptional({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.Percentage,
    description: 'Commission calculation type (percentage or fixed)',
  })
  commissionType: CommissionType | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 5,
    description: 'Commission value (percentage or fixed amount in BRL)',
  })
  commissionValue: number | null;

  @ApiProperty({
    example: '2026-10-20T10:00:00.000Z',
    description: 'Timestamp when the employee record was last updated',
  })
  updatedAt: Date;
}
