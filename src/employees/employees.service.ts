import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { hashPassword } from '../auth/password-hash';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee, EmployeeRole } from './entities/employee.entity';

export const EMAIL_IN_USE_MESSAGE = 'Este e-mail já está em uso.';
export const EMPLOYEE_NOT_FOUND_MESSAGE = 'Funcionário não encontrado.';
export const LAST_ADMIN_MESSAGE =
  'Não é possível remover ou rebaixar o último administrador ativo.';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    await this.ensureEmailAvailable(dto.email);

    const employee = this.employeeRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: dto.role,
      commissionType: null,
      commissionValue: null,
    });

    const saved = await this.employeeRepository.save(employee);
    return this.toResponseDto(saved);
  }

  async findAll(): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.find({
      order: { name: 'ASC' },
    });
    return employees.map((employee) => this.toResponseDto(employee));
  }

  async findOne(employeeId: string): Promise<EmployeeResponseDto> {
    const employee = await this.findActiveEmployee(employeeId);
    return this.toResponseDto(employee);
  }

  async update(
    employeeId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    const employee = await this.findActiveEmployee(employeeId);

    if (
      employee.role === EmployeeRole.Admin &&
      dto.role !== undefined &&
      dto.role !== EmployeeRole.Admin
    ) {
      await this.ensureNotLastAdmin();
    }

    if (dto.email !== undefined) {
      await this.ensureEmailAvailable(dto.email, employeeId);
      employee.email = dto.email;
    }

    if (dto.name !== undefined) {
      employee.name = dto.name;
    }

    if (dto.role !== undefined) {
      employee.role = dto.role;
    }

    if (dto.password !== undefined) {
      employee.passwordHash = await hashPassword(dto.password);
    }

    const saved = await this.employeeRepository.save(employee);
    return this.toResponseDto(saved);
  }

  // Uses logical deletion (ADR 0002): the employee disappears from active
  // listings, while past sales in `orders` keep their seller reference intact.
  async remove(employeeId: string): Promise<void> {
    const employee = await this.findActiveEmployee(employeeId);

    if (employee.role === EmployeeRole.Admin) {
      await this.ensureNotLastAdmin();
    }

    await this.employeeRepository.softRemove(employee);
  }

  private async findActiveEmployee(employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { employeeId },
    });
    if (!employee) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_MESSAGE);
    }
    return employee;
  }

  private async ensureEmailAvailable(
    email: string,
    excludeEmployeeId?: string,
  ): Promise<void> {
    const where = excludeEmployeeId
      ? { email, employeeId: Not(excludeEmployeeId) }
      : { email };
    const isEmailTaken = await this.employeeRepository.exists({ where });
    if (isEmailTaken) {
      throw new ConflictException(EMAIL_IN_USE_MESSAGE);
    }
  }

  private async ensureNotLastAdmin(): Promise<void> {
    const activeAdminsCount = await this.employeeRepository.count({
      where: { role: EmployeeRole.Admin },
    });
    if (activeAdminsCount <= 1) {
      throw new ConflictException(LAST_ADMIN_MESSAGE);
    }
  }

  private toResponseDto(employee: Employee): EmployeeResponseDto {
    return {
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      commissionType: employee.commissionType,
      commissionValue:
        employee.commissionValue !== null
          ? Number(employee.commissionValue)
          : null,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
