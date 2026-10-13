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
import { Customer } from '../../customers/entities/customer.entity';
import { EMAIL_MAX_LENGTH } from '../../database/columns';
import { enumCheck } from '../../database/enum-check';

export enum ContactRequestStatus {
  New = 'new',
  Handled = 'handled',
}

@Entity('contact_requests')
@Check('CHK_contact_requests_status', enumCheck('status', ContactRequestStatus))
export class ContactRequest {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_contact_requests',
  })
  contactRequestId: string;

  // Filled in only when the contact becomes a customer.
  @Index('IDX_contact_requests_customer_id')
  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_contact_requests_customer_id',
  })
  customer: Customer | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: EMAIL_MAX_LENGTH })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 20, default: ContactRequestStatus.New })
  status: ContactRequestStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
