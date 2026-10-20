import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MAX_PERCENTAGE, moneyColumn } from '../../database/columns';
import { enumCheck } from '../../database/enum-check';
import { Employee } from '../../employees/entities/employee.entity';

export enum CommissionCalculationType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

export enum CommissionScope {
  Global = 'global',
  Employee = 'employee',
}

@Entity('commission_rules')
@Check(
  'CHK_commission_rules_calculation_type',
  enumCheck('calculation_type', CommissionCalculationType),
)
@Check('CHK_commission_rules_scope', enumCheck('scope', CommissionScope))
@Check(
  'CHK_commission_rules_scope_employee',
  `("scope" = '${CommissionScope.Employee}' AND "employee_id" IS NOT NULL) OR ("scope" = '${CommissionScope.Global}' AND "employee_id" IS NULL)`,
)
@Check(
  'CHK_commission_rules_value',
  `"value" > 0 AND ("calculation_type" <> '${CommissionCalculationType.Percentage}' OR "value" <= ${MAX_PERCENTAGE})`,
)
@Check(
  'CHK_commission_rules_amount_range',
  '"min_amount" >= 0 AND ("max_amount" IS NULL OR "max_amount" >= "min_amount")',
)
export class CommissionRule {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_commission_rules',
  })
  commissionRuleId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  calculationType: CommissionCalculationType;

  // Percentage (0.01–100) or fixed amount in BRL, depending on the calculation type.
  @Column(moneyColumn())
  value: number;

  @Column({ type: 'varchar', length: 20 })
  scope: CommissionScope;

  @Index('IDX_commission_rules_employee_id')
  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'employee_id',
    foreignKeyConstraintName: 'FK_commission_rules_employee_id',
  })
  employee: Employee | null;

  // Minimum sale amount (inclusive) for this rule to apply.
  @Column(moneyColumn({ default: 0 }))
  minAmount: number;

  // Maximum sale amount (inclusive) for this rule to apply; null indicates no upper bound.
  @Column(moneyColumn({ nullable: true }))
  maxAmount: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
