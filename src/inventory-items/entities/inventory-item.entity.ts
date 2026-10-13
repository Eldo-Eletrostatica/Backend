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
import { Supplier } from '../../suppliers/entities/supplier.entity';

export enum InventoryUnit {
  Kilogram = 'kg',
  Liter = 'liter',
  Unit = 'unit',
}

@Entity('inventory_items')
@Check('CHK_inventory_items_unit', enumCheck('unit', InventoryUnit))
@Check('CHK_inventory_items_balance', '"balance" >= 0')
@Check('CHK_inventory_items_minimum_stock', '"minimum_stock" >= 0')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_inventory_items',
  })
  inventoryItemId: string;

  @Index('IDX_inventory_items_inventory_category_id')
  @Column({ type: 'uuid' })
  inventoryCategoryId: string;

  @ManyToOne(() => InventoryCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'inventory_category_id',
    foreignKeyConstraintName: 'FK_inventory_items_inventory_category_id',
  })
  inventoryCategory: InventoryCategory;

  @Index('IDX_inventory_items_supplier_id')
  @Column({ type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'supplier_id',
    foreignKeyConstraintName: 'FK_inventory_items_supplier_id',
  })
  supplier: Supplier;

  @Column({ type: 'varchar', length: 150 })
  name: string;

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
