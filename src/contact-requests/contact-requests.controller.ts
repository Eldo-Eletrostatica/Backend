import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContactRequestsService } from './contact-requests.service';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { ListContactRequestsQueryDto } from './dto/list-contact-requests-query.dto';
import { UpdateContactRequestStatusDto } from './dto/update-contact-request-status.dto';

// Contact form of individual customers (US06). Sending is public; listing and
// marking as handled are for any employee of the team.
@ApiTags('contact-requests')
@Controller('contact-requests')
export class ContactRequestsController {
  constructor(
    private readonly contactRequestsService: ContactRequestsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Envia o formulário de contato',
    description:
      'Registra o contato como novo (requested) para a equipe atender por WhatsApp.',
  })
  @ApiCreatedResponse({ type: ContactRequestResponseDto })
  @ApiBadRequestResponse({
    description: 'Campo obrigatório em branco ou e-mail inválido',
  })
  create(
    @Body() dto: CreateContactRequestDto,
  ): Promise<ContactRequestResponseDto> {
    return this.contactRequestsService.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Lista as solicitações de contato da equipe' })
  @ApiOkResponse({ type: [ContactRequestResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  findAll(
    @Query() query: ListContactRequestsQueryDto,
  ): Promise<ContactRequestResponseDto[]> {
    return this.contactRequestsService.findAll(query);
  }

  @Patch(':orderId/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Marca a solicitação como atendida, ou desfaz a marcação',
  })
  @ApiOkResponse({ type: ContactRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Status inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiNotFoundResponse({ description: 'Solicitação de contato não encontrada' })
  @ApiConflictResponse({
    description: 'A solicitação já virou orçamento',
  })
  updateStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateContactRequestStatusDto,
  ): Promise<ContactRequestResponseDto> {
    return this.contactRequestsService.updateStatus(orderId, dto);
  }
}
