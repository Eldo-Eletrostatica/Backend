import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PortfolioCategory } from '../../portfolio-categories/entities/portfolio-category.entity';

@Entity('portfolio_projects')
export class PortfolioProject {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_portfolio_projects',
  })
  portfolioProjectId: string;

  @Index('IDX_portfolio_projects_portfolio_category_id')
  @Column({ type: 'uuid' })
  portfolioCategoryId: string;

  @ManyToOne(() => PortfolioCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'portfolio_category_id',
    foreignKeyConstraintName: 'FK_portfolio_projects_portfolio_category_id',
  })
  portfolioCategory: PortfolioCategory;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Free text typed by the admin, not linked to paint_types or part_materials.
  @Column({ type: 'varchar', length: 150 })
  serviceType: string;

  @Column({ type: 'varchar', length: 255 })
  materials: string;

  @Column({ type: 'text' })
  coverUrl: string;

  @Column({ type: 'text', nullable: true })
  beforeUrl: string | null;

  @Column({ type: 'text', nullable: true })
  afterUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
