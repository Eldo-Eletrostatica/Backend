import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListQuotesQueryDto } from './dto/list-quotes-query.dto';
import { QuoteSummaryDto } from './dto/quote-summary.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { QuoteReviewService } from './quote-review.service';

// The quotes asked on the public form, for any employee of the team.
@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuoteReviewController {
  constructor(private readonly quoteReviewService: QuoteReviewService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os orçamentos pedidos no site',
    description:
      'Do mais novo para o mais antigo. Os que já viraram venda saem da lista.',
  })
  @ApiOkResponse({ type: [QuoteSummaryDto] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  findAll(@Query() query: ListQuotesQueryDto): Promise<QuoteSummaryDto[]> {
    return this.quoteReviewService.findAll(query);
  }

  @Patch(':orderId/status')
  @ApiOperation({
    summary: 'Registra o envio do valor ou a resposta do cliente',
    description:
      'sent grava o valor final enviado ao cliente; approved e rejected registram a resposta dele. Só um orçamento aprovado vira venda (POST /sales).',
  })
  @ApiOkResponse({ type: QuoteSummaryDto })
  @ApiBadRequestResponse({ description: 'Status inválido ou valor ausente' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado' })
  @ApiConflictResponse({
    description: 'Mudança de status não permitida ou orçamento já vendido',
  })
  updateStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateQuoteStatusDto,
  ): Promise<QuoteSummaryDto> {
    return this.quoteReviewService.updateStatus(orderId, dto);
  }
}
