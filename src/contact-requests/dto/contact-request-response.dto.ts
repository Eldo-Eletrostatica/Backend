import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../orders/entities/order.entity';

export class ContactRequestResponseDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.Requested })
  status: OrderStatus;

  @ApiProperty({ example: 'Maria Souza' })
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  email: string;

  @ApiProperty({
    example: '61999999999',
    description: 'O atendimento é feito por WhatsApp',
  })
  phone: string;

  @ApiProperty({ example: 'Quero pintar o portão de casa.' })
  message: string;

  @ApiProperty()
  createdAt: Date;
}
