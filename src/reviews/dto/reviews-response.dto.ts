import { ApiProperty } from '@nestjs/swagger';
import { ReviewDto } from './review.dto';

export class ReviewsResponseDto {
  @ApiProperty({
    description:
      'false quando o Google falhou há menos de 5 minutos, quando o limite diário de chamadas acabou ou quando falta configurar a chave; o site mostra uma mensagem no lugar da lista.',
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
      'Até 5 avaliações, com qualquer nota, na ordem de relevância definida pelo Google. As políticas do Google pedem que o site informe essa ordem, por exemplo com o título "Avaliações mais relevantes no Google".',
  })
  reviews: ReviewDto[];
}
