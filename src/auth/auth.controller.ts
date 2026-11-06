import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { findClientIp } from './client-ip';
import { CurrentEmployee } from './decorators/current-employee.decorator';
import { AuthenticatedEmployeeDto } from './dto/authenticated-employee.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginAttemptsService,
  MAX_LOGIN_ATTEMPTS_PER_ACCOUNT,
  MAX_LOGIN_ATTEMPTS_PER_IP,
} from './login-attempts.service';
import { clearSessionCookies, setSessionCookies } from './session-cookies';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isSecureCookie: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly loginAttempts: LoginAttemptsService,
    config: ConfigService,
  ) {
    this.isSecureCookie = config.get<string>('NODE_ENV') === 'production';
  }

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
  @ApiTooManyRequestsResponse({
    description: `${MAX_LOGIN_ATTEMPTS_PER_ACCOUNT} erros no último minuto para a mesma conta a partir do mesmo IP, ou ${MAX_LOGIN_ATTEMPTS_PER_IP} erros a partir do mesmo IP`,
  })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, csrfToken, employee } = await this.loginAttempts.track(
      findClientIp(request),
      dto.email,
      () => this.authService.login(dto),
    );
    setSessionCookies(response, accessToken, csrfToken, this.isSecureCookie);
    return { accessToken, employee };
  }

  // Public on purpose: clearing the cookies needs no valid session, and an
  // expired one must still be able to log out.
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Encerra a sessão do site',
    description:
      'Apaga os cookies de sessão e de CSRF. O token Bearer não tem estado no servidor e continua válido até expirar.',
  })
  @ApiNoContentResponse({ description: 'Cookies da sessão apagados' })
  logout(@Res({ passthrough: true }) response: Response): void {
    clearSessionCookies(response, this.isSecureCookie);
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
