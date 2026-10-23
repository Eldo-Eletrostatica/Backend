import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeRole } from './entities/employee.entity';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  const employeeDto: EmployeeResponseDto = {
    employeeId: '22222222-2222-4222-8222-222222222222',
    name: 'Carlos Mendes',
    email: 'carlos@eldo.com.br',
    role: EmployeeRole.Employee,
    commissionType: null,
    commissionValue: null,
    createdAt: new Date('2026-10-10T12:00:00Z'),
    updatedAt: new Date('2026-10-10T12:00:00Z'),
  };

  const mockEmployeesService = {
    create: jest.fn().mockResolvedValue(employeeDto),
    findAll: jest.fn().mockResolvedValue([employeeDto]),
    findOne: jest.fn().mockResolvedValue(employeeDto),
    update: jest.fn().mockResolvedValue(employeeDto),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
        {
          provide: AuthService,
          useValue: { validateAccessToken: jest.fn() },
        },
        JwtAuthGuard,
        RolesGuard,
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  it('delega criação, listagem, consulta, atualização e remoção ao service', async () => {
    await expect(
      controller.create({
        name: 'Carlos Mendes',
        email: 'carlos@eldo.com.br',
        password: 'Senha@123',
        role: EmployeeRole.Employee,
      }),
    ).resolves.toBe(employeeDto);

    await expect(controller.findAll()).resolves.toEqual([employeeDto]);
    await expect(controller.findOne(employeeDto.employeeId)).resolves.toBe(
      employeeDto,
    );
    await expect(
      controller.update(employeeDto.employeeId, { role: EmployeeRole.Manager }),
    ).resolves.toBe(employeeDto);
    await expect(
      controller.remove(employeeDto.employeeId),
    ).resolves.toBeUndefined();
  });
});
