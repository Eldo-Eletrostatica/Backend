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

@Entity('part_materials')
@Check('CHK_part_materials_price_factor', '"price_factor" > 0')
export class PartMaterial {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_part_materials',
  })
  partMaterialId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Multiplies the price per m² of the paint type in the quote estimate.
  @Column({
    type: 'numeric',
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  priceFactor: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
