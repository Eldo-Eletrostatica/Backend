import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { priceFactorColumn, pricePerM2Column } from '../../database/columns';
import { enumCheck } from '../../database/enum-check';

export const CATALOG_ITEM_NAME_MAX_LENGTH = 100;

export enum CatalogItemType {
  PaintType = 'paintType',
  PartMaterial = 'partMaterial',
}

// Each type fills only its own price column: a paint type has a price per m²
// and a part material has a factor that multiplies it. The IS NOT NULL is
// explicit because a comparison with NULL does not fail a CHECK.
@Entity('catalog_items')
@Check('CHK_catalog_items_type', enumCheck('type', CatalogItemType))
@Check(
  'CHK_catalog_items_price',
  `("type" = '${CatalogItemType.PaintType}' AND "price_per_m2" IS NOT NULL AND "price_per_m2" > 0 AND "price_factor" IS NULL)` +
    ` OR ("type" = '${CatalogItemType.PartMaterial}' AND "price_factor" IS NOT NULL AND "price_factor" > 0 AND "price_per_m2" IS NULL)`,
)
export class CatalogItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_catalog_items',
  })
  catalogItemId: string;

  @Column({ type: 'varchar', length: 20 })
  type: CatalogItemType;

  @Column({ type: 'varchar', length: CATALOG_ITEM_NAME_MAX_LENGTH })
  name: string;

  @Column(pricePerM2Column({ nullable: true }))
  pricePerM2: number | null;

  @Column(priceFactorColumn({ nullable: true }))
  priceFactor: number | null;

  // An inactive item stays in the admin list but leaves the estimator.
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
