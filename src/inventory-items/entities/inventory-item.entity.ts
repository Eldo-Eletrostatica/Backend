import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { stockQuantityColumn } from '../../database/columns';
import { enumCheck } from '../../database/enum-check';
import { InventoryCategory } from '../../inventory-categories/entities/inventory-category.entity';

export enum InventoryUnit {
  Kilogram = 'kg',
  Liter = 'liter',
  Unit = 'unit',
}

export const INVENTORY_ITEM_NAME_MAX_LENGTH = 150;
export const SUPPLIER_NAME_MAX_LENGTH = 150;

@Entity('inventory_items')
@Check('CHK_inventory_items_unit', enumCheck('unit', InventoryUnit))
@Check('CHK_inventory_items_balance', '"balance" >= 0')
@Check('CHK_inventory_items_minimum_stock', '"minimum_stock" >= 0')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_inventory_items',
  })
  inventoryItemId: string;

  @Column({ type: 'varchar', length: INVENTORY_ITEM_NAME_MAX_LENGTH })
  name: string;

  @Index('IDX_inventory_items_category_id')
  @Column({ type: 'uuid' })
  categoryId: string;

  // The administrator manages the categories. A removed category stays here,
  // so the item keeps showing it.
  @ManyToOne(() => InventoryCategory, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'category_id',
    foreignKeyConstraintName: 'FK_inventory_items_category_id',
  })
  inventoryCategory: InventoryCategory;

  // Only the name: the supplier's contact would depend on the supplier, not
  // on the item, and break the third normal form.
  @Column({ type: 'varchar', length: SUPPLIER_NAME_MAX_LENGTH })
  supplierName: string;

  @Column({ type: 'varchar', length: 20 })
  unit: InventoryUnit;

  // Kept in sync with stock_movements: update both in the same transaction.
  @Column(stockQuantityColumn({ default: 0 }))
  balance: number;

  // The stock alert fires when the balance is at or below this value.
  @Column(stockQuantityColumn({ default: 0 }))
  minimumStock: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
