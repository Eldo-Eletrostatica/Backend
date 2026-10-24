import { ApiProperty } from '@nestjs/swagger';
import { ShowcaseItem } from '../entities/showcase-item.entity';

export class PortfolioProjectResponseDto {
  @ApiProperty() showcaseItemId: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() imageUrl: string;
  @ApiProperty() category: string;
  @ApiProperty() serviceType: string;
  @ApiProperty() materials: string;
  @ApiProperty({ nullable: true, type: String }) beforeUrl: string | null;
  @ApiProperty({ nullable: true, type: String }) afterUrl: string | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(item: ShowcaseItem): PortfolioProjectResponseDto {
    return {
      showcaseItemId: item.showcaseItemId,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      category: item.category as string,
      serviceType: item.serviceType as string,
      materials: item.materials as string,
      beforeUrl: item.beforeUrl,
      afterUrl: item.afterUrl,
      createdAt: item.createdAt,
    };
  }
}

export class PaginatedPortfolioProjectsDto {
  @ApiProperty({ type: [PortfolioProjectResponseDto] })
  items: PortfolioProjectResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() hasNextPage: boolean;
}
