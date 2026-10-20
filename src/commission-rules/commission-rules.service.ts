import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MAX_PERCENTAGE } from '../database/columns';
import { Employee } from '../employees/entities/employee.entity';
import { CommissionRuleResponseDto } from './dto/commission-rule-response.dto';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { FindCommissionRulesQueryDto } from './dto/find-commission-rules-query.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import {
  CommissionCalculationType,
  CommissionRule,
  CommissionScope,
} from './entities/commission-rule.entity';

@Injectable()
export class CommissionRulesService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly commissionRuleRepository: Repository<CommissionRule>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(
    dto: CreateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    await this.validateRuleInput(dto);

    const minAmount = dto.minAmount ?? 0;
    const maxAmount = dto.maxAmount ?? null;

    if (dto.isActive ?? true) {
      await this.validateOverlap({
        scope: dto.scope,
        employeeId: dto.employeeId ?? null,
        minAmount,
        maxAmount,
      });
    }

    const rule = this.commissionRuleRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      calculationType: dto.calculationType,
      value: dto.value,
      scope: dto.scope,
      employeeId:
        dto.scope === CommissionScope.Employee ? dto.employeeId : null,
      minAmount,
      maxAmount,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.commissionRuleRepository.save(rule);
    return this.toResponseDto(saved);
  }

  async findAll(
    query?: FindCommissionRulesQueryDto,
  ): Promise<CommissionRuleResponseDto[]> {
    const qb = this.commissionRuleRepository.createQueryBuilder('rule');

    if (query?.scope) {
      qb.andWhere('rule.scope = :scope', { scope: query.scope });
    }

    if (query?.employeeId) {
      qb.andWhere('rule.employeeId = :employeeId', {
        employeeId: query.employeeId,
      });
    }

    if (query?.isActive !== undefined) {
      qb.andWhere('rule.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('rule.minAmount', 'ASC');

    const rules = await qb.getMany();
    return rules.map((r) => this.toResponseDto(r));
  }

  async findOne(commissionRuleId: string): Promise<CommissionRuleResponseDto> {
    const rule = await this.commissionRuleRepository.findOne({
      where: { commissionRuleId },
    });

    if (!rule) {
      throw new NotFoundException('Regra de comissão não encontrada.');
    }

    return this.toResponseDto(rule);
  }

  async update(
    commissionRuleId: string,
    dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    const existing = await this.commissionRuleRepository.findOne({
      where: { commissionRuleId },
    });

    if (!existing) {
      throw new NotFoundException('Regra de comissão não encontrada.');
    }

    const merged = {
      name: dto.name ?? existing.name,
      description:
        dto.description !== undefined ? dto.description : existing.description,
      calculationType: dto.calculationType ?? existing.calculationType,
      value: dto.value ?? existing.value,
      scope: dto.scope ?? existing.scope,
      employeeId:
        dto.scope === CommissionScope.Global
          ? null
          : dto.employeeId !== undefined
            ? dto.employeeId
            : existing.employeeId,
      minAmount:
        dto.minAmount !== undefined ? dto.minAmount : existing.minAmount,
      maxAmount:
        dto.maxAmount !== undefined ? dto.maxAmount : existing.maxAmount,
      isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
    };

    await this.validateRuleInput(merged);

    if (merged.isActive) {
      await this.validateOverlap(
        {
          scope: merged.scope,
          employeeId: merged.employeeId ?? null,
          minAmount: merged.minAmount,
          maxAmount: merged.maxAmount,
        },
        commissionRuleId,
      );
    }

    Object.assign(existing, merged);
    const saved = await this.commissionRuleRepository.save(existing);
    return this.toResponseDto(saved);
  }

  async remove(commissionRuleId: string): Promise<void> {
    const rule = await this.commissionRuleRepository.findOne({
      where: { commissionRuleId },
    });

    if (!rule) {
      throw new NotFoundException('Regra de comissão não encontrada.');
    }

    // Soft delete to maintain historical integrity of finalized sales
    await this.commissionRuleRepository.softDelete(commissionRuleId);
  }

  private async validateRuleInput(input: {
    calculationType: CommissionCalculationType;
    value: number;
    scope: CommissionScope;
    employeeId?: string | null;
    minAmount?: number;
    maxAmount?: number | null;
  }): Promise<void> {
    if (input.value <= 0) {
      throw new BadRequestException(
        'O valor da comissão deve ser maior que zero.',
      );
    }

    if (
      input.calculationType === CommissionCalculationType.Percentage &&
      input.value > MAX_PERCENTAGE
    ) {
      throw new BadRequestException(
        'O percentual de comissão não pode exceder 100%.',
      );
    }

    if (input.scope === CommissionScope.Employee) {
      if (!input.employeeId) {
        throw new BadRequestException(
          'O funcionário é obrigatório para regras com escopo individual.',
        );
      }

      const employee = await this.employeeRepository.findOne({
        where: { employeeId: input.employeeId },
      });

      if (!employee) {
        throw new NotFoundException('Funcionário não encontrado.');
      }
    } else if (input.scope === CommissionScope.Global) {
      if (input.employeeId) {
        throw new BadRequestException(
          'Regras globais não devem possuir funcionário associado.',
        );
      }
    }

    const minAmount = input.minAmount ?? 0;
    if (minAmount < 0) {
      throw new BadRequestException(
        'O valor mínimo da faixa não pode ser negativo.',
      );
    }

    if (input.maxAmount !== undefined && input.maxAmount !== null) {
      if (input.maxAmount < minAmount) {
        throw new BadRequestException(
          'O valor mínimo da faixa não pode ser maior que o valor máximo.',
        );
      }
    }
  }

  private async validateOverlap(
    candidate: {
      scope: CommissionScope;
      employeeId: string | null;
      minAmount: number;
      maxAmount: number | null;
    },
    ignoreRuleId?: string,
  ): Promise<void> {
    const qb = this.commissionRuleRepository
      .createQueryBuilder('rule')
      .where('rule.scope = :scope', { scope: candidate.scope })
      .andWhere('rule.isActive = true');

    if (candidate.scope === CommissionScope.Employee && candidate.employeeId) {
      qb.andWhere('rule.employeeId = :employeeId', {
        employeeId: candidate.employeeId,
      });
    }

    if (ignoreRuleId) {
      qb.andWhere('rule.commissionRuleId != :ignoreRuleId', { ignoreRuleId });
    }

    const activeRules = await qb.getMany();

    const candidateMax =
      candidate.maxAmount !== null && candidate.maxAmount !== undefined
        ? candidate.maxAmount
        : Infinity;

    for (const existing of activeRules) {
      const existingMax =
        existing.maxAmount !== null && existing.maxAmount !== undefined
          ? existing.maxAmount
          : Infinity;

      // Closed intervals [min, max] overlap if:
      // minA <= maxB AND maxA >= minB
      const overlaps =
        candidate.minAmount <= existingMax &&
        candidateMax >= existing.minAmount;

      if (overlaps) {
        throw new ConflictException(
          'Existe sobreposição de faixas de valores para o escopo informado.',
        );
      }
    }
  }

  private toResponseDto(rule: CommissionRule): CommissionRuleResponseDto {
    return {
      commissionRuleId: rule.commissionRuleId,
      name: rule.name,
      description: rule.description,
      calculationType: rule.calculationType,
      value: Number(rule.value),
      scope: rule.scope,
      employeeId: rule.employeeId,
      minAmount: Number(rule.minAmount),
      maxAmount: rule.maxAmount !== null ? Number(rule.maxAmount) : null,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
