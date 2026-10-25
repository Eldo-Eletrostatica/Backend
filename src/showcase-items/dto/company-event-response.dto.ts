import { ApiProperty } from '@nestjs/swagger';
import { ShowcaseItem } from '../entities/showcase-item.entity';

export class CompanyEventResponseDto {
  @ApiProperty() showcaseItemId: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() imageUrl: string;
  @ApiProperty({ example: '2026-09-12' }) eventDate: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(item: ShowcaseItem): CompanyEventResponseDto {
    return {
      showcaseItemId: item.showcaseItemId,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      eventDate: item.eventDate as string,
      createdAt: item.createdAt,
    };
  }
}
