import { ApiProperty } from "@nestjs/swagger";
import { OrderSource } from "../entities/order.entity";
import { IsISO8601, Matches } from "class-validator";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateOrderDto {
    @ApiProperty({format: 'uuid'})
    customerId: string;

    @ApiProperty()
    source: OrderSource;

    @ApiProperty()
    customerMessage: string | null;

    @ApiProperty()
    pdfUrl: string | null;

    @ApiProperty({
        example: '2030-01-15',
        description: 'Prazo de entrega (AAAA-MM-DD)',
      })
      @Matches(DATE_ONLY_PATTERN, {
        message: 'dueDate must be in the YYYY-MM-DD format',
      })
      @IsISO8601({ strict: true })
    dueDate: string | null;
}