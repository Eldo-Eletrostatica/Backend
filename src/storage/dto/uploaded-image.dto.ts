import { ApiProperty } from '@nestjs/swagger';

export class UploadedImageDto {
  @ApiProperty({
    description: 'URL pública da imagem, para salvar no registro que a usa',
    example: 'http://localhost:8333/eldo/visual/7f1c...png',
  })
  url: string;
}
