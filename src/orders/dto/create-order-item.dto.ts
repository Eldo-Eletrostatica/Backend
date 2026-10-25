import { ApiProperty } from "@nestjs/swagger";
import { isNumber, IsNumber, IsPositive, isPositive } from "class-validator";

export class CreateOrderItemDto {
    @ApiProperty({format: 'uuid'})
    orderId : string ;

    @ApiProperty({format: 'uuid'})
    materialCatalogItemId : string ;

    @ApiProperty({format: 'uuid'})
    paintCatalogItemId : string 

    @ApiProperty({
        example: 0.75,
        description: 'Área em metros quadrados por item'
    })
    @IsNumber({
        maxDecimalPlaces: 3
    })
    @IsPositive()
    areaM2: number

    @ApiProperty({
        example: 8,
        description: 'Quantidade de ítens'
    })
    @IsPositive()
    @IsNumber({
        maxDecimalPlaces: 0
    })
    quantity : number

    @ApiProperty()
    @IsNumber({
        maxDecimalPlaces: 3
    })
    @IsPositive)
    pricePerM2 : number

    @ApiProperty()
    @IsNumber({
        maxDecimalPlaces: 3
    })
    @IsPositive()
    priceFactor : number
}