import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MAX_PERCENTAGE } from '../../database/columns';
import { numericTransformer } from '../../database/numeric.transformer';

// Single-row table: the service reads and updates the only record, created by
// the SeedSiteSettings migration.
@Entity('site_settings')
@Check(
  'CHK_site_settings_negotiation_margin',
  `"negotiation_margin" >= 0 AND "negotiation_margin" <= ${MAX_PERCENTAGE}`,
)
export class SiteSetting {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_site_settings',
  })
  siteSettingId: string;

  // Null means the site uses the default visual identity defined in code.
  @Column({ type: 'jsonb', nullable: true })
  visualPublished: Record<string, unknown> | null;

  // Unpublished changes shown only in the admin preview.
  @Column({ type: 'jsonb', nullable: true })
  visualDraft: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  isEstimatorEnabled: boolean;

  // Percentage added on top of the calculated price to form the price range.
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  negotiationMargin: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
