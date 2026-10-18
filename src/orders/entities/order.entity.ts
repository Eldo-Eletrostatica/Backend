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
import { moneyColumn } from '../../database/columns';
import { enumCheck } from '../../database/enum-check';
import { Employee } from '../../employees/entities/employee.entity';

export const TRACKING_CODE_LENGTH = 8;

export enum OrderSource {
  Contact = 'contact',
  Pdf = 'pdf',
  Estimator = 'estimator',
  Internal = 'internal',
}

export enum OrderStatus {
  Requested = 'requested',
  Sent = 'sent',
  Approved = 'approved',
  Rejected = 'rejected',
  Queued = 'queued',
  InProduction = 'inProduction',
  Finishing = 'finishing',
  Completed = 'completed',
}

// From these statuses on the order is a sale with a service order in production.
export const SALE_STATUSES = [
  OrderStatus.Queued,
  OrderStatus.InProduction,
  OrderStatus.Finishing,
  OrderStatus.Completed,
];

const SALE_COLUMNS = [
  'seller_employee_id',
  'final_price',
  'commission',
  'sold_at',
  'tracking_code',
  'scope',
  'due_date',
];

const saleStatusList = SALE_STATUSES.map((status) => `'${status}'`).join(', ');
const saleColumnsFilled = SALE_COLUMNS.map(
  (column) => `"${column}" IS NOT NULL`,
).join(' AND ');

// Contact request, quote, sale and service order are stages of the same record
// (ADR 0005): the status moves it forward and each stage fills its own columns.
@Entity('orders')
@Check('CHK_orders_source', enumCheck('source', OrderSource))
@Check('CHK_orders_status', enumCheck('status', OrderStatus))
@Check(
  'CHK_orders_price_range',
  '"min_price" IS NULL OR "max_price" IS NULL OR "min_price" <= "max_price"',
)
@Check('CHK_orders_final_price', '"final_price" >= 0')
@Check('CHK_orders_commission', '"commission" >= 0')
@Check(
  'CHK_orders_sale',
  `"status" NOT IN (${saleStatusList}) OR (${saleColumnsFilled})`,
)
export class Order {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_orders' })
  orderId: string;

  @Index('IDX_orders_customer_id')
  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_orders_customer_id',
  })
  customer: Customer;

  // Filled in when the sale is launched.
  @Index('IDX_orders_seller_employee_id')
  @Column({ type: 'uuid', nullable: true })
  sellerEmployeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'seller_employee_id',
    foreignKeyConstraintName: 'FK_orders_seller_employee_id',
  })
  sellerEmployee: Employee | null;

  @Column({ type: 'varchar', length: 20 })
  source: OrderSource;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.Requested })
  status: OrderStatus;

  // What the customer wrote in the contact or quote form.
  @Column({ type: 'text', nullable: true })
  customerMessage: string | null;

  // Only orders requested by PDF upload have a file.
  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  // Estimated range, filled in only by the estimator.
  @Column(moneyColumn({ nullable: true }))
  minPrice: number | null;

  @Column(moneyColumn({ nullable: true }))
  maxPrice: number | null;

  // Price the company sends to the customer, and the sale value once sold.
  @Column(moneyColumn({ nullable: true }))
  finalPrice: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  // Snapshot of the seller's commission at sale time (ADR 0003).
  @Column(moneyColumn({ nullable: true }))
  commission: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  soldAt: Date | null;

  // Random code the customer uses to track the order (ADR 0001).
  @Index('UQ_orders_tracking_code', { unique: true })
  @Column({ type: 'char', length: TRACKING_CODE_LENGTH, nullable: true })
  trackingCode: string | null;

  @Column({ type: 'text', nullable: true })
  scope: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
