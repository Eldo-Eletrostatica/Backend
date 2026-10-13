import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../database/numeric.transformer';

@Entity('paint_types')
@Check('CHK_paint_types_price_per_m2', '"price_per_m2" > 0')
export class PaintType {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_paint_types',
  })
  paintTypeId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  pricePerM2: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
