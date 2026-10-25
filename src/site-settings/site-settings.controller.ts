import {
  Body,
  Controller,
  Get,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { UploadedImageDto } from '../storage/dto/uploaded-image.dto';
import { MAX_IMAGE_BYTES } from '../storage/image-format';
import { UpdateVisualSettingsDto } from './dto/update-visual-settings.dto';
import { SiteSettingsService } from './site-settings.service';
import { VisualSettings } from './visual-settings';

@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get('visual')
  @ApiOperation({
    summary: 'Configuração visual publicada, que o site público usa',
  })
  @ApiOkResponse()
  getPublishedVisualSettings(): Promise<VisualSettings> {
    return this.siteSettingsService.getPublishedVisualSettings();
  }

  @Get('visual/draft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({ summary: 'Rascunho da configuração visual, para o editor' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  getDraftVisualSettings(): Promise<VisualSettings> {
    return this.siteSettingsService.getDraftVisualSettings();
  }

  @Patch('visual/draft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary: 'Salva no rascunho só os campos enviados',
    description: 'O site público só muda quando o rascunho é publicado.',
  })
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  updateDraftVisualSettings(
    @Body() dto: UpdateVisualSettingsDto,
  ): Promise<VisualSettings> {
    return this.siteSettingsService.updateDraftVisualSettings(dto);
  }

  @Post('visual/images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary: 'Envia uma imagem de logotipo ou de banner',
    description:
      'Devolve a URL para salvar no rascunho. Aceita PNG, JPEG e WebP até 5 MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadedImageDto })
  @ApiBadRequestResponse({ description: 'Sem arquivo ou formato não aceito' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  @ApiPayloadTooLargeResponse({ description: 'Imagem acima de 5 MB' })
  // The limit stops multer from buffering an oversized file in memory. Multer
  // already rejects a file that reaches the limit, hence the extra byte.
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES + 1 } }),
  )
  uploadVisualImage(
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File,
  ): Promise<UploadedImageDto> {
    return this.siteSettingsService.uploadVisualImage(file.buffer);
  }

  @Post('visual/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary: 'Publica o rascunho: o site passa a usar essa configuração',
  })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  publishVisualSettings(): Promise<VisualSettings> {
    return this.siteSettingsService.publishVisualSettings();
  }

  @Post('visual/draft/discard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary: 'Descarta o rascunho: ele volta a ser igual à versão publicada',
  })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  discardVisualDraft(): Promise<VisualSettings> {
    return this.siteSettingsService.discardVisualDraft();
  }

  @Post('visual/restore-default')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.Admin)
  @ApiOperation({
    summary:
      'Restaura a identidade visual padrão no site e no rascunho, na hora',
  })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso restrito a administradores' })
  restoreDefaultVisualSettings(): Promise<VisualSettings> {
    return this.siteSettingsService.restoreDefaultVisualSettings();
  }

  @Patch('estimator/get')
  @ApiOperation({
    summary: 'Consulta o status daferramenta de orçamento automático',
  })
  @ApiOkResponse({
    description: 'Status obtido com sucesso',
    type: Boolean,
  })
  getIsEstimatorEnabled(): Promise<boolean> {
    return this.siteSettingsService.getIsEstimatorEnabled();
  }

  @Patch('estimator/disable')
  @ApiOperation({
    summary: 'Desabilita a ferramenta de orçamento automático',
  })
  @ApiOkResponse({
    description: 'Ferramenta desativada com sucesso',
  })
  disableEstimator(): Promise<boolean> {
    return this.siteSettingsService.toggleEstimator(false);
  }

  @Patch('estimator/enable')
  @ApiOperation({
    summary: 'Habilita a ferramenta de orçamento automático',
  })
  @ApiOkResponse({
    description: 'Ferramenta ativada com sucesso',
  })
  enableEstimator(): Promise<boolean> {
    return this.siteSettingsService.toggleEstimator(true);
  }

  @Get('estimator/negotiation-margin/get')
  @ApiOperation({
    summary: 'Consulta a margem de negociação gerador de orçamento',
  })
  @ApiOkResponse({
    description: 'Margem obtida com sucesso',
    type: Number,
  })
  getNegotiationMargin(): Promise<number> {
    return this.siteSettingsService.getNegotiationMargin();
  }

  @Patch('estimator/negotiation-margin/set')
  @ApiOperation({
    summary: 'Altera a margem de negociação gerador de orçamento',
  })
  @ApiOkResponse({
    description: 'Margem alterada com sucesso',
    type: Number,
  })
  setNegotiationMargin(@Body() margin: number): Promise<number> {
    return this.siteSettingsService.setNegotiationMargin(margin);
  }
}
