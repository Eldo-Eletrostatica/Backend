import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class EstimatedQuoteDto {
  @ApiProperty({ format: 'uuid' })
  orderId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    description: 'Preço base do estimator',
  })
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsPositive()
  lowerBound: number;

  @ApiProperty({
    description: 'Preço do estimator com margem de negociação',
  })
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsPositive()
  upperBound: number;
}
