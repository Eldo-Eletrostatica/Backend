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
import { enumCheck } from '../../database/enum-check';
import { numericTransformer } from '../../database/numeric.transformer';

export enum QuoteSource {
  Pdf = 'pdf',
  Estimator = 'estimator',
}

export enum QuoteStatus {
  Requested = 'requested',
  Sent = 'sent',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity('quotes')
@Check('CHK_quotes_source', enumCheck('source', QuoteSource))
@Check('CHK_quotes_status', enumCheck('status', QuoteStatus))
@Check(
  'CHK_quotes_price_range',
  '"min_price" IS NULL OR "max_price" IS NULL OR "min_price" <= "max_price"',
)
export class Quote {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_quotes' })
  quoteId: string;

  @Index('IDX_quotes_customer_id')
  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_quotes_customer_id',
  })
  customer: Customer;

  @Column({ type: 'varchar', length: 20 })
  source: QuoteSource;

  // Only quotes requested by PDF upload have a file.
  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: QuoteStatus.Requested })
  status: QuoteStatus;

  // Estimated range, filled in only by the estimator.
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  minPrice: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  maxPrice: number | null;

  // Price the company sends back to the customer.
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  finalPrice: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
