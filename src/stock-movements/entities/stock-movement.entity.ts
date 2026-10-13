import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { enumCheck } from '../../database/enum-check';
import { numericTransformer } from '../../database/numeric.transformer';
import { Employee } from '../../employees/entities/employee.entity';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity';

export enum StockMovementType {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

@Entity('stock_movements')
@Check('CHK_stock_movements_type', enumCheck('type', StockMovementType))
@Check('CHK_stock_movements_quantity', '"quantity" > 0')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_stock_movements',
  })
  stockMovementId: string;

  @Index('IDX_stock_movements_inventory_item_id')
  @Column({ type: 'uuid' })
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'inventory_item_id',
    foreignKeyConstraintName: 'FK_stock_movements_inventory_item_id',
  })
  inventoryItem: InventoryItem;

  @Index('IDX_stock_movements_employee_id')
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'employee_id',
    foreignKeyConstraintName: 'FK_stock_movements_employee_id',
  })
  employee: Employee;

  @Column({ type: 'varchar', length: 20 })
  type: StockMovementType;

  // Always positive; the type says whether it adds to or subtracts from the balance.
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  @Column({ type: 'text' })
  reason: string;

  // Indexed for the history-by-period report (US16).
  @Index('IDX_stock_movements_moved_at')
  @Column({ type: 'timestamptz' })
  movedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
