import { ApiProperty } from '@nestjs/swagger';
import { MAX_PERCENTAGE } from '../../database/columns';

export class EstimatorSettingsDto {
  @ApiProperty({
    description:
      'false esconde o simulador de orçamento do site; o upload de PDF continua disponível.',
  })
  isEnabled: boolean;

  @ApiProperty({
    example: 15,
    minimum: 0,
    maximum: MAX_PERCENTAGE,
    description:
      'Percentual somado ao preço calculado para formar o topo da faixa de preço',
  })
  negotiationMargin: number;
}
