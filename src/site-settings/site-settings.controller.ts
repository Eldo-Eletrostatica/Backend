import {
  Body,
  Controller,
  Get,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateVisualSettingsDto } from './dto/update-visual-settings.dto';
import { UploadedImageDto } from '../storage/dto/uploaded-image.dto';
import { MAX_IMAGE_BYTES } from '../storage/image-format';
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
  @ApiOperation({ summary: 'Rascunho da configuração visual, para o editor' })
  @ApiOkResponse()
  getDraftVisualSettings(): Promise<VisualSettings> {
    return this.siteSettingsService.getDraftVisualSettings();
  }

  @Patch('visual/draft')
  @ApiOperation({
    summary: 'Salva no rascunho só os campos enviados',
    description: 'O site público só muda quando o rascunho é publicado.',
  })
  @ApiOkResponse()
  updateDraftVisualSettings(
    @Body() dto: UpdateVisualSettingsDto,
  ): Promise<VisualSettings> {
    return this.siteSettingsService.updateDraftVisualSettings(dto);
  }

  @Post('visual/images')
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
  @ApiOperation({
    summary: 'Publica o rascunho: o site passa a usar essa configuração',
  })
  @ApiCreatedResponse()
  publishVisualSettings(): Promise<VisualSettings> {
    return this.siteSettingsService.publishVisualSettings();
  }

  @Post('visual/draft/discard')
  @ApiOperation({
    summary: 'Descarta o rascunho: ele volta a ser igual à versão publicada',
  })
  @ApiCreatedResponse()
  discardVisualDraft(): Promise<VisualSettings> {
    return this.siteSettingsService.discardVisualDraft();
  }

  @Post('visual/restore-default')
  @ApiOperation({
    summary:
      'Restaura a identidade visual padrão no site e no rascunho, na hora',
  })
  @ApiCreatedResponse()
  restoreDefaultVisualSettings(): Promise<VisualSettings> {
    return this.siteSettingsService.restoreDefaultVisualSettings();
  }


  @Patch('estimator/get')
  @ApiOperation({
    summary: 'Consulta o status daferramenta de orçamento automático',
  })
  @ApiOkResponse({
    description: 'Status obtido com sucesso',
    type: Boolean
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
    summary: 'Consulta a margem de negociação gerador de orçamento'
  })
  @ApiOkResponse({
    description: 'Margem obtida com sucesso',
    type: Number
  })
  getNegotiationMargin(): Promise<number>
  {
    return this.siteSettingsService.getNegotiationMargin();
  }

  @Patch('estimator/negotiation-margin/set')
  @ApiOperation({
    summary: 'Altera a margem de negociação gerador de orçamento'
  })
  @ApiOkResponse({
    description: 'Margem alterada com sucesso',
    type: Number
  })
  setNegotiationMargin(@Body() margin : number): Promise<number>
  {
    return this.siteSettingsService.setNegotiationMargin(margin);
  }
}
