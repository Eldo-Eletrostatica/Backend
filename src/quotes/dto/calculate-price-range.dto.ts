import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { OrderItemDto } from '../../common/dto/order-item.dto';

export class CalculatePriceRangeDto {
  @ApiProperty({
    type: [OrderItemDto],
    description: 'Peças do projeto. O preço vem do catálogo, nunca do pedido.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
