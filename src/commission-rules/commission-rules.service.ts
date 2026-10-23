import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MAX_PERCENTAGE } from '../database/columns';
import {
  CommissionType,
  Employee,
} from '../employees/entities/employee.entity';
import { CommissionRuleResponseDto } from './dto/commission-rule-response.dto';
import {
  MAX_COMMISSION_VALUE,
  UpdateCommissionRuleDto,
} from './dto/update-commission-rule.dto';

@Injectable()
export class CommissionRulesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  // Retrieves the current commission rule configured for an employee.
  async getRule(employeeId: string): Promise<CommissionRuleResponseDto> {
    const employee = await this.findEmployee(employeeId);
    return this.toResponseDto(employee);
  }

  // Updates or clears the commission rule directly on the employee entity (ADR 0005).
  async updateRule(
    employeeId: string,
    dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    this.validateCommissionPair(dto.commissionType, dto.commissionValue);

    const employee = await this.findEmployee(employeeId);

    employee.commissionType = dto.commissionType;
    employee.commissionValue = dto.commissionValue;

    const saved = await this.employeeRepository.save(employee);
    return this.toResponseDto(saved);
  }

  // Enforces that commission type and value are either both provided or both null,
  // and validates value boundaries when provided.
  private validateCommissionPair(
    type: CommissionType | null,
    value: number | null,
  ): void {
    if ((type === null) !== (value === null)) {
      throw new BadRequestException(
        'Tipo e valor da comissão devem ser informados juntos ou ambos nulos.',
      );
    }

    if (value !== null) {
      if (value <= 0) {
        throw new BadRequestException(
          'O valor da comissão deve ser maior que zero.',
        );
      }

      if (value > MAX_COMMISSION_VALUE) {
        throw new BadRequestException(
          'O valor da comissão não pode exceder 9.999.999.999,99.',
        );
      }

      if (type === CommissionType.Percentage && value > MAX_PERCENTAGE) {
        throw new BadRequestException(
          'O percentual de comissão não pode exceder 100%.',
        );
      }
    }
  }

  private async findEmployee(employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    return employee;
  }

  private toResponseDto(employee: Employee): CommissionRuleResponseDto {
    return {
      employeeId: employee.employeeId,
      commissionType: employee.commissionType,
      commissionValue:
        employee.commissionValue !== null
          ? Number(employee.commissionValue)
          : null,
      updatedAt: employee.updatedAt,
    };
  }
}
