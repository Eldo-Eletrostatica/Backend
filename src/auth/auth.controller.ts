import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentEmployee } from './decorators/current-employee.decorator';
import { AuthenticatedEmployeeDto } from './dto/authenticated-employee.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica um funcionário na área interna',
    description:
      'Valida e-mail e senha do funcionário e emite um token JWT para acesso às rotas internas.',
  })
  @ApiOkResponse({
    description: 'Funcionário autenticado com sucesso',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados de login inválidos' })
  @ApiUnauthorizedResponse({ description: 'E-mail ou senha inválidos' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retorna os dados do funcionário autenticado',
    description:
      'Valida a sessão atual e retorna a identificação e o nível de acesso do funcionário logado.',
  })
  @ApiOkResponse({
    description: 'Dados do funcionário autenticado',
    type: AuthenticatedEmployeeDto,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado ou token inválido' })
  getAuthenticatedEmployee(
    @CurrentEmployee() employee: AuthenticatedEmployeeDto,
  ): AuthenticatedEmployeeDto {
    return employee;
  }
}
