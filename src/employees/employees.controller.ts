import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeRole } from './entities/employee.entity';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.Admin)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastra um novo funcionário',
    description:
      'Cria uma conta de funcionário com nível de permissão (admin, manager ou employee). Restrito a administradores.',
  })
  @ApiCreatedResponse({
    description: 'Funcionário cadastrado com sucesso',
    type: EmployeeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de cadastro inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiConflictResponse({ description: 'E-mail já está em uso' })
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    return this.employeesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista os funcionários ativos',
    description:
      'Retorna todos os funcionários ativos (não removidos logicamente) em ordem alfabética. Restrito a administradores.',
  })
  @ApiOkResponse({
    description: 'Lista de funcionários ativos',
    type: [EmployeeResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  findAll(): Promise<EmployeeResponseDto[]> {
    return this.employeesService.findAll();
  }

  @Get(':employeeId')
  @ApiOperation({
    summary: 'Consulta os dados de um funcionário',
    description: 'Busca um funcionário ativo pelo seu identificador UUID.',
  })
  @ApiOkResponse({
    description: 'Funcionário encontrado',
    type: EmployeeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  findOne(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.findOne(employeeId);
  }

  @Patch(':employeeId')
  @ApiOperation({
    summary: 'Atualiza os dados ou o nível de permissão de um funcionário',
    description:
      'Permite alterar nome, e-mail, senha ou nível de permissão de um funcionário ativo. Restrito a administradores.',
  })
  @ApiOkResponse({
    description: 'Funcionário atualizado com sucesso',
    type: EmployeeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de atualização inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  @ApiConflictResponse({
    description:
      'E-mail já está em uso ou tentativa de rebaixar o último administrador',
  })
  update(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.update(employeeId, dto);
  }

  @Delete(':employeeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove logicamente um funcionário',
    description:
      'Preenche deleted_at para retirar o funcionário das listagens e bloquear seu login, preservando o histórico de vendas antigas (ADR 0002).',
  })
  @ApiNoContentResponse({ description: 'Funcionário removido com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  @ApiConflictResponse({
    description: 'Não é possível remover o último administrador ativo',
  })
  remove(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<void> {
    return this.employeesService.remove(employeeId);
  }
}
