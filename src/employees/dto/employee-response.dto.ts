import { ApiProperty } from '@nestjs/swagger';
import { CommissionType, EmployeeRole } from '../entities/employee.entity';

export class EmployeeResponseDto {
  @ApiProperty({ format: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'Carlos Mendes' })
  name: string;

  @ApiProperty({ example: 'carlos@eldo.com.br' })
  email: string;

  @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.Employee })
  role: EmployeeRole;

  @ApiProperty({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.Percentage,
  })
  commissionType: CommissionType | null;

  @ApiProperty({ nullable: true, example: 5 })
  commissionValue: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
