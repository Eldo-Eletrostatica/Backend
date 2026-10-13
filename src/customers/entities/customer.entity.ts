import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { enumCheck } from '../../database/enum-check';

export enum CustomerType {
  Individual = 'individual',
  Business = 'business',
}

@Entity('customers')
@Check('CHK_customers_type', enumCheck('type', CustomerType))
export class Customer {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_customers' })
  customerId: string;

  @Column({ type: 'varchar', length: 20 })
  type: CustomerType;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  // CPF (11 digits) or CNPJ (14 digits), stored without punctuation.
  @Index('UQ_customers_document', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ type: 'varchar', length: 14 })
  document: string;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
