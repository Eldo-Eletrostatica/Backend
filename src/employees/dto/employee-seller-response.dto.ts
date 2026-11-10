import { ApiProperty } from '@nestjs/swagger';

// Minimal employee data for the seller selector when launching a sale (US21).
export class EmployeeSellerResponseDto {
  @ApiProperty({ format: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'Carlos Mendes' })
  name: string;
}
