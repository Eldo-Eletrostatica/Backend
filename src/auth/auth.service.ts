import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
const DEFAULT_INITIAL_ADMIN_NAME = 'Administrador Eldo';
// Fixed scrypt hash verified when the email is not found, equalizing response
// time with a wrong-password attempt so login timing cannot enumerate emails.
const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {
    this.jwtSecret = config.getOrThrow<string>('JWT_SECRET');
  }

  // Returns the same generic error whether the email does not exist or the
  // password is wrong, preventing user enumeration (US09 acceptance criterion 2).
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    let employee = await this.employeeRepository.findOne({
      where: { email: dto.email },
    });

    if (!employee) {
      employee = await this.provisionInitialAdminIfEligible(
        dto.email,
        dto.password,
      );
    }

    if (!employee) {
      await verifyPassword(dto.password, DUMMY_PASSWORD_HASH);
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
      this.jwtSecret,
    );

    return {
      accessToken,
      employee: authenticatedEmployee,
    };
  }

  // Validates the JWT and reloads the active employee so a soft-deleted account
  // or a role change takes effect immediately on protected routes.
  async validateAccessToken(token: string): Promise<AuthenticatedEmployeeDto> {
    const payload = verifyJwt(token, this.jwtSecret);
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
  // exists yet and both INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are set.
  private async provisionInitialAdminIfEligible(
    email: string,
    password: string,
  ): Promise<Employee | null> {
    const initialEmail = this.config
      .get<string>('INITIAL_ADMIN_EMAIL')
      ?.trim()
      .toLowerCase();
    const initialPassword = this.config.get<string>('INITIAL_ADMIN_PASSWORD');

    if (!initialEmail || !initialPassword) {
      return null;
    }

    if (email !== initialEmail || password !== initialPassword) {
      return null;
    }

    const hasAdmin = await this.employeeRepository.exists({
      where: { role: EmployeeRole.Admin },
    });
    if (hasAdmin) {
      return null;
    }

    const initialName =
      this.config.get<string>('INITIAL_ADMIN_NAME')?.trim() ||
      DEFAULT_INITIAL_ADMIN_NAME;

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
