import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_suppliers' })
  supplierId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  // Free text: phone, e-mail or the name of a person to talk to.
  @Column({ type: 'varchar', length: 150 })
  contact: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
