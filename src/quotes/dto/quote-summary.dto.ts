import { ApiProperty } from '@nestjs/swagger';
import { OrderSource, OrderStatus } from '../../orders/entities/order.entity';

export class QuoteSummaryItemDto {
  @ApiProperty({ example: 'Epóxi' })
  paintName: string;

  @ApiProperty({ example: 'Aço' })
  materialName: string;

  @ApiProperty({ example: 2.5 })
  areaM2: number;

  @ApiProperty({ example: 4 })
  quantity: number;
}

// What the team sees of a quote request: the customer, what was asked and the
// value, once the Eldo sends one.
export class QuoteSummaryDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.Requested })
  status: OrderStatus;

  @ApiProperty({ enum: [OrderSource.Estimator, OrderSource.Pdf] })
  source: OrderSource;

  @ApiProperty({ example: 'Metalúrgica Souza' })
  customerName: string;

  @ApiProperty({ type: String, nullable: true, example: '11222333000181' })
  customerDocument: string | null;

  @ApiProperty({ example: 'contato@souza.com.br' })
  customerEmail: string;

  @ApiProperty({ example: '61999999999' })
  customerPhone: string;

  @ApiProperty({ type: String, nullable: true })
  customerMessage: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Projeto em PDF; só nos orçamentos enviados por PDF',
  })
  pdfUrl: string | null;

  @ApiProperty({ type: Number, nullable: true })
  minPrice: number | null;

  @ApiProperty({ type: Number, nullable: true })
  maxPrice: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Valor enviado ao cliente; null até a Eldo enviar',
  })
  finalPrice: number | null;

  @ApiProperty({ type: String, nullable: true, example: '2030-01-15' })
  dueDate: string | null;

  @ApiProperty({ type: Date, nullable: true })
  sentAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [QuoteSummaryItemDto] })
  items: QuoteSummaryItemDto[];
}
