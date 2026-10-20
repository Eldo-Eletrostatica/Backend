import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';
import {
  CommissionCalculationType,
  CommissionRule,
  CommissionScope,
} from './entities/commission-rule.entity';

const CENTS_PER_REAL = 100;
export const NO_COMMISSION = 0;

export function calculateRuleCommission(
  rule: Pick<CommissionRule, 'calculationType' | 'value'>,
  saleAmount: number,
): number {
  if (saleAmount <= 0 || !rule || rule.value <= 0) {
    return NO_COMMISSION;
  }

  if (rule.calculationType === CommissionCalculationType.Fixed) {
    return rule.value;
  }

  return Math.round(saleAmount * rule.value) / CENTS_PER_REAL;
}

@Injectable()
export class CommissionCalculatorService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly commissionRuleRepository: Repository<CommissionRule>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async calculateCommission(
    sellerEmployeeId: string,
    saleAmount: number,
    manager?: EntityManager,
  ): Promise<number> {
    if (saleAmount <= 0) {
      return NO_COMMISSION;
    }

    const ruleRepo = manager
      ? manager.getRepository(CommissionRule)
      : this.commissionRuleRepository;

    const empRepo = manager
      ? manager.getRepository(Employee)
      : this.employeeRepository;

    // 1. Regra específica ativa do funcionário para a faixa da venda
    const employeeRule = await ruleRepo
      .createQueryBuilder('rule')
      .where('rule.scope = :scope', { scope: CommissionScope.Employee })
      .andWhere('rule.employeeId = :employeeId', {
        employeeId: sellerEmployeeId,
      })
      .andWhere('rule.isActive = true')
      .andWhere('rule.minAmount <= :saleAmount', { saleAmount })
      .andWhere('(rule.maxAmount IS NULL OR rule.maxAmount >= :saleAmount)', {
        saleAmount,
      })
      .orderBy('rule.minAmount', 'DESC')
      .getOne();

    if (employeeRule) {
      return calculateRuleCommission(employeeRule, saleAmount);
    }

    // 2. Regra global ativa para a faixa da venda
    const globalRule = await ruleRepo
      .createQueryBuilder('rule')
      .where('rule.scope = :scope', { scope: CommissionScope.Global })
      .andWhere('rule.isActive = true')
      .andWhere('rule.minAmount <= :saleAmount', { saleAmount })
      .andWhere('(rule.maxAmount IS NULL OR rule.maxAmount >= :saleAmount)', {
        saleAmount,
      })
      .orderBy('rule.minAmount', 'DESC')
      .getOne();

    if (globalRule) {
      return calculateRuleCommission(globalRule, saleAmount);
    }

    // 3. Fallback para comissão legada do cadastro de funcionários (US21)
    const employee = await empRepo.findOne({
      where: { employeeId: sellerEmployeeId },
    });

    if (employee?.commissionType && employee.commissionValue) {
      if (employee.commissionType === CommissionType.Fixed) {
        return employee.commissionValue;
      }
      return Math.round(saleAmount * employee.commissionValue) / CENTS_PER_REAL;
    }

    return NO_COMMISSION;
  }
}
