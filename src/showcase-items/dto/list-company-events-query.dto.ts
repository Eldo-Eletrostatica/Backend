import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum CompanyEventOrderBy {
  EventDate = 'eventDate',
  CreatedAt = 'createdAt',
}

export class ListCompanyEventsQueryDto {
  @ApiPropertyOptional({
    enum: CompanyEventOrderBy,
    default: CompanyEventOrderBy.EventDate,
    description:
      '"eventDate" para a linha do tempo do site ou "createdAt" para o painel, com o evento recém-criado primeiro',
  })
  @IsOptional()
  @IsEnum(CompanyEventOrderBy)
  orderBy?: CompanyEventOrderBy;
}
