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
import { EMAIL_MAX_LENGTH } from '../../database/columns';
import { enumCheck } from '../../database/enum-check';

// CNPJ has 14 digits and CPF has 11; both are stored without punctuation.
const DOCUMENT_MAX_LENGTH = 14;

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

  // CPF or CNPJ.
  @Index('UQ_customers_document', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ type: 'varchar', length: DOCUMENT_MAX_LENGTH })
  document: string;

  @Column({ type: 'varchar', length: EMAIL_MAX_LENGTH })
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
