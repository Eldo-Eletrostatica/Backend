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
import { CommissionRule } from '../../commission-rules/entities/commission-rule.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { enumCheck } from '../../database/enum-check';
import { numericTransformer } from '../../database/numeric.transformer';
import { Employee } from '../../employees/entities/employee.entity';
import { Quote } from '../../quotes/entities/quote.entity';

export enum ServiceOrderStatus {
  Queued = 'queued',
  InProduction = 'in_production',
  Finishing = 'finishing',
  Completed = 'completed',
}

// A sale and its service order are the same record (ADR 0004).
@Entity('service_orders')
@Check('CHK_service_orders_status', enumCheck('status', ServiceOrderStatus))
@Check('CHK_service_orders_total', '"total" >= 0')
@Check('CHK_service_orders_commission', '"commission" >= 0')
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_service_orders',
  })
  serviceOrderId: string;

  @Index('IDX_service_orders_customer_id')
  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_service_orders_customer_id',
  })
  customer: Customer;

  // A sale may skip the quote; an approved quote becomes at most one sale.
  @Index('UQ_service_orders_quote_id', { unique: true })
  @Column({ type: 'uuid', nullable: true })
  quoteId: string | null;

  @ManyToOne(() => Quote, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'quote_id',
    foreignKeyConstraintName: 'FK_service_orders_quote_id',
  })
  quote: Quote | null;

  @Index('IDX_service_orders_seller_employee_id')
  @Column({ type: 'uuid' })
  sellerEmployeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'seller_employee_id',
    foreignKeyConstraintName: 'FK_service_orders_seller_employee_id',
  })
  sellerEmployee: Employee;

  // Rule used to compute the commission; null when no rule matched.
  @Index('IDX_service_orders_commission_rule_id')
  @Column({ type: 'uuid', nullable: true })
  commissionRuleId: string | null;

  @ManyToOne(() => CommissionRule, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'commission_rule_id',
    foreignKeyConstraintName: 'FK_service_orders_commission_rule_id',
  })
  commissionRule: CommissionRule | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  total: number;

  // Snapshot of the commission at sale time (ADR 0003).
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  commission: number;

  @Column({ type: 'timestamptz' })
  soldAt: Date;

  // Random code the customer uses to track the order (ADR 0001).
  @Index('UQ_service_orders_tracking_code', { unique: true })
  @Column({ type: 'char', length: 8 })
  trackingCode: string;

  @Column({ type: 'text' })
  scope: string;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'varchar', length: 20, default: ServiceOrderStatus.Queued })
  status: ServiceOrderStatus;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
