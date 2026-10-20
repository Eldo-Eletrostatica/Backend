import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { enumCheck } from '../../database/enum-check';

export enum ShowcaseItemType {
  PortfolioProject = 'portfolioProject',
  CompanyEvent = 'companyEvent',
}

// Portfolio projects and company events share one table; the columns that
// belong to a single type are nullable and required by a CHECK for that type.
@Entity('showcase_items')
@Check('CHK_showcase_items_type', enumCheck('type', ShowcaseItemType))
@Check(
  'CHK_showcase_items_portfolio_project',
  `"type" <> '${ShowcaseItemType.PortfolioProject}' OR ("category" IS NOT NULL AND "service_type" IS NOT NULL AND "materials" IS NOT NULL)`,
)
@Check(
  'CHK_showcase_items_company_event',
  `"type" <> '${ShowcaseItemType.CompanyEvent}' OR "event_date" IS NOT NULL`,
)
export class ShowcaseItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_showcase_items',
  })
  showcaseItemId: string;

  @Index('IDX_showcase_items_type')
  @Column({ type: 'varchar', length: 20 })
  type: ShowcaseItemType;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Cover of a portfolio project or the picture of an event.
  @Column({ type: 'text' })
  imageUrl: string;

  // Gallery filter of the portfolio, typed by the admin.
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  // Free text typed by the admin, not linked to the catalog.
  @Column({ type: 'varchar', length: 150, nullable: true })
  serviceType: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  materials: string | null;

  @Column({ type: 'text', nullable: true })
  beforeUrl: string | null;

  @Column({ type: 'text', nullable: true })
  afterUrl: string | null;

  // Orders the event timeline on the site.
  @Column({ type: 'date', nullable: true })
  eventDate: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
