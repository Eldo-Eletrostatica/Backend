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
import {
  EMAIL_MAX_LENGTH,
  EMPLOYEE_NAME_MAX_LENGTH,
  MAX_PERCENTAGE,
  moneyColumn,
} from '../../database/columns';
import { enumCheck } from '../../database/enum-check';

export enum EmployeeRole {
  Admin = 'admin',
  Manager = 'manager',
  Employee = 'employee',
}

export enum CommissionType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

@Entity('employees')
@Check('CHK_employees_role', enumCheck('role', EmployeeRole))
@Check(
  'CHK_employees_commission_type',
  enumCheck('commission_type', CommissionType),
)
@Check(
  'CHK_employees_commission_pair',
  '("commission_type" IS NULL) = ("commission_value" IS NULL)',
)
@Check(
  'CHK_employees_commission_value',
  `"commission_value" > 0 AND ("commission_type" <> '${CommissionType.Percentage}' OR "commission_value" <= ${MAX_PERCENTAGE})`,
)
export class Employee {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_employees' })
  employeeId: string;

  @Column({ type: 'varchar', length: EMPLOYEE_NAME_MAX_LENGTH })
  name: string;

  // Partial index: the e-mail of a removed employee can be reused.
  @Index('UQ_employees_email', { unique: true, where: '"deleted_at" IS NULL' })
  @Column({ type: 'varchar', length: EMAIL_MAX_LENGTH })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: EmployeeRole.Employee })
  role: EmployeeRole;

  // Commission rule of the seller (ADR 0005); null for who does not sell.
  @Column({ type: 'varchar', length: 20, nullable: true })
  commissionType: CommissionType | null;

  // Percentage (0–100) or fixed amount in BRL, depending on the type.
  @Column(moneyColumn({ nullable: true }))
  commissionValue: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
