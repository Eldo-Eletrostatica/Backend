import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Max,
} from 'class-validator';
import { MAX_STOCK_QUANTITY } from '../../database/columns';
import { StockMovementType } from '../entities/stock-movement.entity';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateStockMovementDto {
  @ApiProperty()
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty({ enum: StockMovementType, example: StockMovementType.Inbound })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ description: 'Quantidade positiva, com até três decimais' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(MAX_STOCK_QUANTITY)
  quantity: number;

  @ApiProperty({ example: 'Compra' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  reason: string;
}
