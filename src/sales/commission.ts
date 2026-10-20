import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';

export const NO_COMMISSION = 0;

const CENTS_PER_REAL = 100;

type CommissionRule = Pick<Employee, 'commissionType' | 'commissionValue'>;

// The commission is frozen on the sale (ADR 0003): this runs once, when the
// sale is launched, and the result is stored in the order.
export function calculateCommission(
  rule: CommissionRule,
  saleValue: number,
): number {
  if (rule.commissionType === null || rule.commissionValue === null) {
    return NO_COMMISSION;
  }
  if (rule.commissionType === CommissionType.Fixed) {
    return rule.commissionValue;
  }
  // saleValue * percentage / 100 is in reais; rounding the product first gives
  // whole cents without a float error from dividing by 100 twice.
  return Math.round(saleValue * rule.commissionValue) / CENTS_PER_REAL;
}
