import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CatalogItem } from '../catalog-items/entities/catalog-item.entity';
import { CompanyNotifier } from '../mail/company-notifier';
import {
  formatArea,
  formatCnpj,
  formatDateOnly,
  formatMoney,
  formatPhone,
} from '../mail/notification-format';
import { CreateEstimatedQuoteDto } from './dto/create-estimated-quote.dto';
import { CreatePdfQuoteDto } from './dto/create-pdf-quote.dto';
import { OrderItemDto } from '../common/dto/order-item.dto';
import { QuoteCustomerDto } from './dto/quote-customer.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';

const UNKNOWN_CATALOG_ITEM = 'item do catálogo';
const CLOSING_LINE =
  'Responda a este e-mail para falar com o cliente. O orçamento também está na área interna.';

function describeCustomer(customer: QuoteCustomerDto): string[] {
  return [
    `Empresa: ${customer.name}`,
    `CNPJ: ${formatCnpj(customer.cnpj)}`,
    `Telefone: ${formatPhone(customer.phone)}`,
    `E-mail: ${customer.email}`,
  ];
}

function describeDetails(
  dueDate: string | undefined,
  message: string | undefined,
): string[] {
  return [
    ...(dueDate ? [`Prazo desejado: ${formatDateOnly(dueDate)}`] : []),
    ...(message ? ['', 'Observações:', message] : []),
  ];
}

// Tells the company about a new quote request (US07 and US28): the estimator
// one with the parts and the price range, the PDF one with the file attached.
@Injectable()
export class QuoteNotifier {
  private readonly logger = new Logger(QuoteNotifier.name);

  constructor(
    private readonly companyNotifier: CompanyNotifier,
    @InjectRepository(CatalogItem)
    private readonly catalogItemRepository: Repository<CatalogItem>,
  ) {}

  async notifyEstimatedQuote(
    dto: CreateEstimatedQuoteDto,
    quote: QuoteResponseDto,
  ): Promise<void> {
    const parts = await this.describeParts(dto.items);
    await this.companyNotifier.notify(
      {
        replyTo: dto.customer.email,
        subject: `Novo orçamento pelo simulador: ${dto.customer.name}`,
        text: [
          'Chegou um novo orçamento pelo simulador do site.',
          '',
          ...describeCustomer(dto.customer),
          ...describeDetails(dto.dueDate, undefined),
          '',
          'Peças:',
          ...parts,
          '',
          `Faixa estimada: ${formatMoney(quote.minPrice ?? 0)} a ${formatMoney(quote.maxPrice ?? 0)}`,
          ...describeDetails(undefined, dto.message),
          '',
          CLOSING_LINE,
        ].join('\n'),
      },
      `o orçamento ${quote.orderId}`,
    );
  }

  notifyPdfQuote(
    dto: CreatePdfQuoteDto,
    quote: QuoteResponseDto,
    content: Buffer,
  ): Promise<void> {
    return this.companyNotifier.notify(
      {
        replyTo: dto.email,
        subject: `Novo orçamento por PDF: ${dto.name}`,
        text: [
          'Chegou um novo orçamento por PDF pelo site. O projeto está anexado.',
          '',
          ...describeCustomer(dto),
          ...describeDetails(dto.dueDate, dto.message),
          '',
          CLOSING_LINE,
        ].join('\n'),
        attachments: [
          {
            filename: `projeto-${dto.cnpj}.pdf`,
            content,
            contentType: 'application/pdf',
          },
        ],
      },
      `o orçamento ${quote.orderId}`,
    );
  }

  // "3 peças de 2 m², Epóxi em Aço". Runs after the quote is saved, so a
  // failed lookup falls back to a generic name instead of losing the notice.
  private async describeParts(items: OrderItemDto[]): Promise<string[]> {
    const nameById = new Map<string, string>();
    try {
      const catalogItems = await this.catalogItemRepository.findBy({
        catalogItemId: In(
          items.flatMap((item) => [
            item.paintCatalogItemId,
            item.materialCatalogItemId,
          ]),
        ),
      });
      for (const catalogItem of catalogItems) {
        nameById.set(catalogItem.catalogItemId, catalogItem.name);
      }
    } catch (error) {
      this.logger.error('Falha ao buscar os nomes do catálogo no aviso', error);
    }
    return items.map((item) => {
      const pieces = item.quantity === 1 ? 'peça' : 'peças';
      const paint =
        nameById.get(item.paintCatalogItemId) ?? UNKNOWN_CATALOG_ITEM;
      const material =
        nameById.get(item.materialCatalogItemId) ?? UNKNOWN_CATALOG_ITEM;
      return `- ${item.quantity} ${pieces} de ${formatArea(item.areaM2)} m², ${paint} em ${material}`;
    });
  }
}
