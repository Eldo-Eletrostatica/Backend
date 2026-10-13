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
import { numericTransformer } from '../../database/numeric.transformer';
import { PaintType } from '../../paint-types/entities/paint-type.entity';
import { PartMaterial } from '../../part-materials/entities/part-material.entity';
import { Quote } from './quote.entity';

@Entity('quote_items')
@Check('CHK_quote_items_area_m2', '"area_m2" > 0')
@Check('CHK_quote_items_quantity', '"quantity" > 0')
export class QuoteItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_quote_items',
  })
  quoteItemId: string;

  @Index('IDX_quote_items_quote_id')
  @Column({ type: 'uuid' })
  quoteId: string;

  // Items only exist inside their quote.
  @ManyToOne(() => Quote, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'quote_id',
    foreignKeyConstraintName: 'FK_quote_items_quote_id',
  })
  quote: Quote;

  @Index('IDX_quote_items_part_material_id')
  @Column({ type: 'uuid' })
  partMaterialId: string;

  @ManyToOne(() => PartMaterial, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'part_material_id',
    foreignKeyConstraintName: 'FK_quote_items_part_material_id',
  })
  partMaterial: PartMaterial;

  @Index('IDX_quote_items_paint_type_id')
  @Column({ type: 'uuid' })
  paintTypeId: string;

  @ManyToOne(() => PaintType, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'paint_type_id',
    foreignKeyConstraintName: 'FK_quote_items_paint_type_id',
  })
  paintType: PaintType;

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

  // Snapshots of the price rules at quote time (ADR 0003).
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  pricePerM2: number;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  priceFactor: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
