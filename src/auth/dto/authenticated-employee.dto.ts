import { ApiProperty } from '@nestjs/swagger';
import { EmployeeRole } from '../../employees/entities/employee.entity';

export class AuthenticatedEmployeeDto {
  @ApiProperty({ format: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'Maria Silva' })
  name: string;

  @ApiProperty({ example: 'maria@eldo.com.br' })
  email: string;

  @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.Admin })
  role: EmployeeRole;
}
