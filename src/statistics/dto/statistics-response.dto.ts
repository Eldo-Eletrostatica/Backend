import { ApiProperty } from '@nestjs/swagger';
import { PaintTypeRankingDto } from './paint-type-ranking.dto';

export class StatisticsResponseDto {
  @ApiProperty({
    example: '2026-10-01',
    description: 'Data inicial do período consultado (YYYY-MM-DD)',
  })
  startDate: string;

  @ApiProperty({
    example: '2026-10-31',
    description: 'Data final do período consultado (YYYY-MM-DD)',
  })
  endDate: string;

  @ApiProperty({
    example: true,
    description:
      'false quando o período não tem orçamentos nem pedidos com tipo de pintura; o dashboard mostra um estado vazio.',
  })
  hasData: boolean;

  @ApiProperty({
    example: 42,
    description:
      'Orçamentos criados no período: pedidos com origem pdf ou estimator',
  })
  quoteCount: number;

  @ApiProperty({
    example: 13,
    description: 'Orçamentos do período que já viraram venda',
  })
  convertedQuoteCount: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 0.3095,
    description:
      'convertedQuoteCount ÷ quoteCount, de 0 a 1. null quando não há orçamentos no período.',
  })
  conversionRate: number | null;

  @ApiProperty({
    type: [PaintTypeRankingDto],
    description:
      'Tipos de pintura mais pedidos no período, do mais pedido para o menos pedido',
  })
  topPaintTypes: PaintTypeRankingDto[];
}
