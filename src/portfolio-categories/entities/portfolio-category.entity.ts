import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('portfolio_categories')
export class PortfolioCategory {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_portfolio_categories',
  })
  portfolioCategoryId: string;

  @Index('UQ_portfolio_categories_name', { unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Order of the filter buttons in the gallery, set by the admin.
  @Column({ type: 'integer' })
  position: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
