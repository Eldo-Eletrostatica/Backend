import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SaleCustomerDto } from './sale-customer.dto';
import { SaleItemDto } from './sale-item.dto';

// finalPrice is numeric(12,2).
export const MAX_SALE_VALUE = 9_999_999_999.99;
const MONEY_DECIMAL_PLACES = 2;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Without an approved order the sale is direct: the employee sends the customer,
// the items and the value instead.
const isDirectSale = (sale: LaunchSaleDto) => sale.orderId === undefined;

export class LaunchSaleDto {
  @ApiPropertyOptional({
    description:
      'Orçamento aprovado que vira venda. Sem ele, informe customer, items e finalPrice (venda direta).',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({
    description: 'Funcionário que fechou a venda e recebe a comissão',
  })
  @IsUUID()
  sellerEmployeeId: string;

  @ApiProperty({ description: 'Escopo detalhado do serviço' })
  @IsString()
  @IsNotEmpty()
  scope: string;

  @ApiProperty({
    example: '2030-01-15',
    description: 'Prazo de entrega (AAAA-MM-DD)',
  })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'dueDate must be in the YYYY-MM-DD format',
  })
  @IsISO8601({ strict: true })
  dueDate: string;

  @ApiPropertyOptional({
    type: SaleCustomerDto,
    description: 'Só na venda direta',
  })
  @ValidateIf(isDirectSale)
  @IsDefined()
  @ValidateNested()
  @Type(() => SaleCustomerDto)
  customer?: SaleCustomerDto;

  @ApiPropertyOptional({
    type: [SaleItemDto],
    description: 'Só na venda direta',
  })
  @ValidateIf(isDirectSale)
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items?: SaleItemDto[];

  @ApiPropertyOptional({
    description: 'Valor da venda em reais, só na venda direta',
  })
  @ValidateIf(isDirectSale)
  @IsNumber({ maxDecimalPlaces: MONEY_DECIMAL_PLACES })
  @IsPositive()
  @Max(MAX_SALE_VALUE)
  finalPrice?: number;
}
