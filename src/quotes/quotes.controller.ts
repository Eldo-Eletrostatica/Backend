import {
  Body,
  Controller,
  Get,
  ParseFilePipe,
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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateEstimatedQuoteDto } from './dto/create-estimated-quote.dto';
import { CreatePdfQuoteDto } from './dto/create-pdf-quote.dto';
import { EstimatorOptionsDto } from './dto/estimator-options.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { MAX_QUOTE_PDF_BYTES } from './quote-pdf';
import { QuotesService } from './quotes.service';

// Public quote form for business customers (US07).
@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('estimator')
  @ApiOperation({
    summary: 'Opções do simulador de orçamento',
    description:
      'Se o simulador está ligado e os tipos de pintura e materiais ativos.',
  })
  @ApiOkResponse({ type: EstimatorOptionsDto })
  getEstimatorOptions(): Promise<EstimatorOptionsDto> {
    return this.quotesService.getEstimatorOptions();
  }

  @Post('estimator')
  @ApiOperation({
    summary: 'Pede um orçamento pelo simulador',
    description:
      'Calcula a faixa de preço com o catálogo e a margem atuais, cadastra o cliente pelo CNPJ (ou usa o existente) e guarda o orçamento. A faixa é uma estimativa inicial, sujeita à confirmação da Eldo.',
  })
  @ApiCreatedResponse({ type: QuoteResponseDto })
  @ApiBadRequestResponse({
    description:
      'Campo obrigatório em branco, área ou quantidade zero ou negativa',
  })
  @ApiForbiddenResponse({ description: 'Simulador desativado' })
  @ApiUnprocessableEntityResponse({
    description: 'Tipo de pintura ou material inexistente ou desativado',
  })
  createEstimatedQuote(
    @Body() dto: CreateEstimatedQuoteDto,
  ): Promise<QuoteResponseDto> {
    return this.quotesService.createEstimatedQuote(dto);
  }

  @Post('pdf')
  @ApiOperation({
    summary: 'Pede um orçamento enviando o projeto em PDF',
    description:
      'Disponível mesmo com o simulador desativado. A equipe responde em até 48 horas.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreatePdfQuoteDto) },
        {
          type: 'object',
          properties: { file: { type: 'string', format: 'binary' } },
          required: ['file'],
        },
      ],
    },
  })
  @ApiCreatedResponse({ type: QuoteResponseDto })
  @ApiBadRequestResponse({
    description: 'Sem arquivo, arquivo que não é PDF ou dados inválidos',
  })
  @ApiPayloadTooLargeResponse({ description: 'PDF acima de 10 MB' })
  // The limit stops multer from buffering an oversized file in memory. Multer
  // already rejects a file that reaches the limit, hence the extra byte.
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_QUOTE_PDF_BYTES + 1 } }),
  )
  createPdfQuote(
    @Body() dto: CreatePdfQuoteDto,
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File,
  ): Promise<QuoteResponseDto> {
    return this.quotesService.createPdfQuote(dto, file.buffer);
  }
}
