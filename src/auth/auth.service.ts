import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeRole } from '../employees/entities/employee.entity';
import { AuthenticatedEmployeeDto } from './dto/authenticated-employee.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { signJwt, verifyJwt } from './jwt-token';
import { hashPassword, verifyPassword } from './password-hash';

export const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.';
export const UNAUTHORIZED_MESSAGE = 'Autenticação necessária.';
const DEFAULT_JWT_SECRET = 'eldo-dev-jwt-secret';
const DEFAULT_INITIAL_ADMIN_NAME = 'Administrador Eldo';
const DEFAULT_INITIAL_ADMIN_EMAIL = 'admin@eldo.com.br';
const DEFAULT_INITIAL_ADMIN_PASSWORD = 'Admin@123';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  // Returns the same generic error whether the email does not exist or the
  // password is wrong, preventing user enumeration (US09 acceptance criterion 2).
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const email = dto.email.trim().toLowerCase();
    let employee = await this.employeeRepository.findOne({
      where: { email },
    });

    if (!employee) {
      employee = await this.provisionInitialAdminIfEligible(
        email,
        dto.password,
      );
    }

    if (!employee) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await verifyPassword(
      dto.password,
      employee.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const authenticatedEmployee = this.toAuthenticatedEmployee(employee);
    const accessToken = signJwt(
      {
        sub: employee.employeeId,
        email: employee.email,
        role: employee.role,
      },
      this.getJwtSecret(),
    );

    return {
      accessToken,
      employee: authenticatedEmployee,
    };
  }

  // Validates the JWT and reloads the active employee so a soft-deleted account
  // or a role change takes effect immediately on protected routes.
  async validateAccessToken(token: string): Promise<AuthenticatedEmployeeDto> {
    const payload = verifyJwt(token, this.getJwtSecret());
    if (!payload) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    const employee = await this.employeeRepository.findOne({
      where: { employeeId: payload.sub },
    });
    if (!employee) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    return this.toAuthenticatedEmployee(employee);
  }

  // Creates the initial administrator on the first login when no administrator
  // exists yet, keeping the employees table empty for schema tests until needed.
  private async provisionInitialAdminIfEligible(
    email: string,
    password: string,
  ): Promise<Employee | null> {
    const initialEmail = (
      process.env.INITIAL_ADMIN_EMAIL || DEFAULT_INITIAL_ADMIN_EMAIL
    )
      .trim()
      .toLowerCase();
    const initialPassword =
      process.env.INITIAL_ADMIN_PASSWORD || DEFAULT_INITIAL_ADMIN_PASSWORD;

    if (email !== initialEmail || password !== initialPassword) {
      return null;
    }

    const hasAdmin = await this.employeeRepository.exists({
      where: { role: EmployeeRole.Admin },
    });
    if (hasAdmin) {
      return null;
    }

    const initialName = (
      process.env.INITIAL_ADMIN_NAME || DEFAULT_INITIAL_ADMIN_NAME
    ).trim();

    const admin = this.employeeRepository.create({
      name: initialName,
      email: initialEmail,
      passwordHash: await hashPassword(initialPassword),
      role: EmployeeRole.Admin,
      commissionType: null,
      commissionValue: null,
    });
    return this.employeeRepository.save(admin);
  }

  private getJwtSecret(): string {
    return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  }

  private toAuthenticatedEmployee(
    employee: Employee,
  ): AuthenticatedEmployeeDto {
    return {
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    };
  }
}
