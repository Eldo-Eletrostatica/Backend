import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('inventory_categories')
export class InventoryCategory {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_inventory_categories',
  })
  inventoryCategoryId: string;

  @Index('UQ_inventory_categories_name', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
