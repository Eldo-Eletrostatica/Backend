import { ApiProperty } from '@nestjs/swagger';

export class EstimatorOptionDto {
  @ApiProperty()
  catalogItemId: string;

  @ApiProperty({ example: 'Epóxi' })
  name: string;
}

// What the public quote screen needs: whether to show the estimator and the
// active options. The prices stay out: the calculation is done by the API.
export class EstimatorOptionsDto {
  @ApiProperty({
    description:
      'false: a tela mostra só o upload de PDF, e as listas vêm vazias',
  })
  isEnabled: boolean;

  @ApiProperty({ type: [EstimatorOptionDto] })
  paintTypes: EstimatorOptionDto[];

  @ApiProperty({ type: [EstimatorOptionDto] })
  partMaterials: EstimatorOptionDto[];
}
