import { ApiProperty } from '@nestjs/swagger';

// A DTO instead of a TypeORM entity: reviews come from Google on every
// request, and the Places API policies forbid storing them.
export class ReviewDto {
  @ApiProperty({ example: 'Maria Souza' })
  authorName: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://www.google.com/maps/contrib/123',
    description:
      'Perfil do autor no Google. As políticas do Google pedem que o nome do autor leve a este link.',
  })
  authorProfileUrl: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://lh3.googleusercontent.com/a/abc',
    description: 'Foto do autor; null quando o Google não devolve uma.',
  })
  authorPhotoUrl: string | null;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiProperty({
    example: 'Serviço excelente, pintura impecável.',
    description: 'Vazio quando a pessoa deu só a nota, sem comentário.',
  })
  comment: string;

  @ApiProperty({ example: '2026-09-30T14:00:00.000Z' })
  publishedAt: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://www.google.com/maps/reviews/abc',
    description:
      'A avaliação no Google Maps. As políticas do Google pedem um link para ela.',
  })
  reviewUrl: string | null;
}
