import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthenticatedEmployeeDto } from './dto/authenticated-employee.dto';
import { LoginResponseDto } from './dto/login-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  const authenticatedEmployee: AuthenticatedEmployeeDto = {
    employeeId: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Oliveira',
    email: 'maria@eldo.com.br',
    role: EmployeeRole.Admin,
  };
  const loginResponse: LoginResponseDto = {
    accessToken: 'jwt.token.value',
    employee: authenticatedEmployee,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue(loginResponse),
            validateAccessToken: jest
              .fn()
              .mockResolvedValue(authenticatedEmployee),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('retorna o token e o funcionário no login', async () => {
    await expect(
      controller.login({
        email: 'maria@eldo.com.br',
        password: 'Senha@123',
      }),
    ).resolves.toBe(loginResponse);
  });

  it('retorna o funcionário autenticado na consulta da sessão', () => {
    expect(controller.getAuthenticatedEmployee(authenticatedEmployee)).toBe(
      authenticatedEmployee,
    );
  });
});
