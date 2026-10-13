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

export enum EmployeeRole {
  Admin = 'admin',
  Manager = 'manager',
  Employee = 'employee',
}

@Entity('employees')
@Check('CHK_employees_role', enumCheck('role', EmployeeRole))
export class Employee {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_employees' })
  employeeId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  // Partial index: the e-mail of a removed employee can be reused.
  @Index('UQ_employees_email', { unique: true, where: '"deleted_at" IS NULL' })
  @Column({ type: 'varchar', length: EMAIL_MAX_LENGTH })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: EmployeeRole.Employee })
  role: EmployeeRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
