import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedEmployeeDto } from './authenticated-employee.dto';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Token JWT para envio no header Authorization: Bearer <token>',
  })
  accessToken: string;

  @ApiProperty({ type: AuthenticatedEmployeeDto })
  employee: AuthenticatedEmployeeDto;
}
