import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const INVENTORY_CATEGORY_NAME_MAX_LENGTH = 100;

// The unique index is created by hand in the migration: it is on LOWER(name)
// and only for the categories not removed, which the decorator cannot say.
@Entity('inventory_categories')
@Index('UQ_inventory_categories_name', { synchronize: false })
export class InventoryCategory {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_inventory_categories',
  })
  inventoryCategoryId: string;

  @Column({ type: 'varchar', length: INVENTORY_CATEGORY_NAME_MAX_LENGTH })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // A plain column, not @DeleteDateColumn: TypeORM would hide a removed
  // category from the items that still use it, and they must keep showing it.
  // The list of categories filters on it by hand.
  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
