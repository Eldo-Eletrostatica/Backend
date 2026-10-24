import { ApiProperty } from '@nestjs/swagger';
import { ReviewDto } from './review.dto';

export class ReviewsResponseDto {
  @ApiProperty({
    description:
      'false quando o Google está fora do ar e ainda não há avaliações guardadas; o site mostra uma mensagem no lugar da lista.',
  })
  isAvailable: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://maps.google.com/?cid=1234567890',
    description: 'Perfil da empresa no Google, para o link "ver mais".',
  })
  googleProfileUrl: string | null;

  @ApiProperty({
    type: [ReviewDto],
    description:
      'As avaliações que o Google devolve, com qualquer nota. A Places API devolve no máximo 5.',
  })
  reviews: ReviewDto[];
}
