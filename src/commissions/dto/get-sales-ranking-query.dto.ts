import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { GetCommissionsQueryDto } from './get-commissions-query.dto';

export enum SalesRankingOrderBy {
  Value = 'value',
  Volume = 'volume',
}

export class GetSalesRankingQueryDto extends GetCommissionsQueryDto {
  @ApiPropertyOptional({
    enum: SalesRankingOrderBy,
    default: SalesRankingOrderBy.Value,
    description:
      'Critério de ordenação do ranking: "value" (valor total vendido em R$) ou "volume" (quantidade de vendas)',
  })
  @IsOptional()
  @IsEnum(SalesRankingOrderBy, {
    message: 'orderBy deve ser "value" ou "volume"',
  })
  orderBy?: SalesRankingOrderBy = SalesRankingOrderBy.Value;
}
