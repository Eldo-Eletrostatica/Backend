import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionType } from '../../employees/entities/employee.entity';

export class CommissionRuleResponseDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Identificador único do funcionário',
  })
  employeeId: string;

  @ApiPropertyOptional({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.Percentage,
    description: 'Tipo de cálculo da comissão: percentual ou valor fixo',
  })
  commissionType: CommissionType | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 5,
    description: 'Valor da comissão em percentual ou reais',
  })
  commissionValue: number | null;

  @ApiProperty({
    example: '2026-10-20T10:00:00.000Z',
    description: 'Data e hora da última atualização do registro',
  })
  updatedAt: Date;
}
