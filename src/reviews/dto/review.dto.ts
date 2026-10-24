import { ApiProperty } from '@nestjs/swagger';

// A DTO instead of a TypeORM entity: reviews come from Google and are only
// cached in memory by ReviewsService, so there is no reviews table.
export class ReviewDto {
  @ApiProperty({ example: 'Maria Souza' })
  authorName: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiProperty({
    example: 'Serviço excelente, pintura impecável.',
    description: 'Vazio quando a pessoa deu só a nota, sem comentário.',
  })
  comment: string;

  @ApiProperty({ example: '2026-09-30T14:00:00.000Z' })
  publishedAt: Date;
}
