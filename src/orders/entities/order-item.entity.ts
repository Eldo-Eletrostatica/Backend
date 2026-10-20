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
import { CatalogItem } from '../../catalog-items/entities/catalog-item.entity';
import { priceFactorColumn, pricePerM2Column } from '../../database/columns';
import { numericTransformer } from '../../database/numeric.transformer';
import { Order } from './order.entity';

// Both foreign keys point to catalog_items; the database only checks that the
// item exists, so the service must check that each one has the expected type.
@Entity('order_items')
@Check('CHK_order_items_area_m2', '"area_m2" > 0')
@Check('CHK_order_items_quantity', '"quantity" > 0')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_order_items',
  })
  orderItemId: string;

  @Index('IDX_order_items_order_id')
  @Column({ type: 'uuid' })
  orderId: string;

  // Items only exist inside their order.
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'FK_order_items_order_id',
  })
  order: Order;

  @Index('IDX_order_items_material_catalog_item_id')
  @Column({ type: 'uuid' })
  materialCatalogItemId: string;

  @ManyToOne(() => CatalogItem, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'material_catalog_item_id',
    foreignKeyConstraintName: 'FK_order_items_material_catalog_item_id',
  })
  materialCatalogItem: CatalogItem;

  @Index('IDX_order_items_paint_catalog_item_id')
  @Column({ type: 'uuid' })
  paintCatalogItemId: string;

  @ManyToOne(() => CatalogItem, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'paint_catalog_item_id',
    foreignKeyConstraintName: 'FK_order_items_paint_catalog_item_id',
  })
  paintCatalogItem: CatalogItem;

  // Area of a single piece.
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  areaM2: number;

  @Column({ type: 'integer' })
  quantity: number;

  // Snapshots of the catalog prices at quote time (ADR 0003).
  @Column(pricePerM2Column())
  pricePerM2: number;

  @Column(priceFactorColumn())
  priceFactor: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
