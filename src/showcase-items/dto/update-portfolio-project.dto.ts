import { PartialType } from '@nestjs/swagger';
import { CreatePortfolioProjectDto } from './create-portfolio-project.dto';

export class UpdatePortfolioProjectDto extends PartialType(
  CreatePortfolioProjectDto,
) {}
