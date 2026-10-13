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
import { enumCheck } from '../../database/enum-check';
import { numericTransformer } from '../../database/numeric.transformer';
import { Employee } from '../../employees/entities/employee.entity';

export enum CommissionRuleType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

// A rule may target an employee, a sale value range, both or neither;
// the most specific rule that matches a sale wins.
@Entity('commission_rules')
@Check('CHK_commission_rules_type', enumCheck('type', CommissionRuleType))
@Check(
  'CHK_commission_rules_total_range',
  '"min_total" IS NULL OR "max_total" IS NULL OR "min_total" <= "max_total"',
)
@Check(
  'CHK_commission_rules_value',
  `"value" > 0 AND ("type" <> '${CommissionRuleType.Percentage}' OR "value" <= 100)`,
)
export class CommissionRule {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_commission_rules',
  })
  commissionRuleId: string;

  @Index('IDX_commission_rules_employee_id')
  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'employee_id',
    foreignKeyConstraintName: 'FK_commission_rules_employee_id',
  })
  employee: Employee | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  minTotal: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  maxTotal: number | null;

  @Column({ type: 'varchar', length: 20 })
  type: CommissionRuleType;

  // Percentage (0–100) or fixed amount in BRL, depending on the type.
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  value: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
