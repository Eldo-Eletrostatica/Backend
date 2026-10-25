import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  CatalogItem,
  CatalogItemType,
} from '../catalog-items/entities/catalog-item.entity';
import { findOrCreateCustomer } from '../common/find-or-create-customer';
import { buildOrderItems } from '../common/order-items';
import { CustomerType } from '../customers/entities/customer.entity';
import {
  Order,
  OrderSource,
  OrderStatus,
} from '../orders/entities/order.entity';
import { SiteSettingsService } from '../site-settings/site-settings.service';
import { StorageService } from '../storage/storage.service';
import { CreateEstimatedQuoteDto } from './dto/create-estimated-quote.dto';
import { CreatePdfQuoteDto } from './dto/create-pdf-quote.dto';
import { EstimatorOptionsDto } from './dto/estimator-options.dto';
import { QuoteCustomerDto } from './dto/quote-customer.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { calculatePriceRange } from './price-range';
import {
  isPdf,
  QUOTE_PDFS_FOLDER,
  toStoredPdf,
  UNSUPPORTED_QUOTE_FILE_MESSAGE,
} from './quote-pdf';

export const ESTIMATOR_DISABLED_MESSAGE =
  'O simulador de orçamento está desativado. Envie o projeto em PDF.';

type QuoteData = Pick<
  Order,
  'source' | 'customerMessage' | 'dueDate' | 'pdfUrl' | 'minPrice' | 'maxPrice'
>;

@Injectable()
export class QuotesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CatalogItem)
    private readonly catalogItemRepository: Repository<CatalogItem>,
    private readonly siteSettingsService: SiteSettingsService,
    private readonly storageService: StorageService,
  ) {}

  async getEstimatorOptions(): Promise<EstimatorOptionsDto> {
    const { isEnabled } = await this.siteSettingsService.getEstimatorSettings();
    if (!isEnabled) {
      return { isEnabled, paintTypes: [], partMaterials: [] };
    }

    const activeItems = await this.catalogItemRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    const optionsOfType = (type: CatalogItemType) =>
      activeItems
        .filter((catalogItem) => catalogItem.type === type)
        .map(({ catalogItemId, name }) => ({ catalogItemId, name }));

    return {
      isEnabled,
      paintTypes: optionsOfType(CatalogItemType.PaintType),
      partMaterials: optionsOfType(CatalogItemType.PartMaterial),
    };
  }

  // The range is calculated with the catalog prices and the margin of now, and
  // both the range and the prices are stored with the quote (ADR 0003).
  async createEstimatedQuote(
    dto: CreateEstimatedQuoteDto,
  ): Promise<QuoteResponseDto> {
    const { isEnabled, negotiationMargin } =
      await this.siteSettingsService.getEstimatorSettings();
    if (!isEnabled) {
      throw new ForbiddenException(ESTIMATOR_DISABLED_MESSAGE);
    }

    return this.dataSource.transaction(async (manager) => {
      const orderItems = await buildOrderItems(manager, dto.items);
      const { minPrice, maxPrice } = calculatePriceRange(
        orderItems,
        negotiationMargin,
      );
      const order = await this.saveQuote(manager, dto.customer, {
        source: OrderSource.Estimator,
        customerMessage: dto.message ?? null,
        dueDate: dto.dueDate,
        pdfUrl: null,
        minPrice,
        maxPrice,
      });

      for (const orderItem of orderItems) {
        orderItem.orderId = order.orderId;
      }
      await manager.save(orderItems);
      return toResponse(order);
    });
  }

  // The PDF stays available even with the estimator turned off (US08). The file
  // is stored before the order: if saving the order fails, the PDF is left
  // without a record, which costs less than an order without its file.
  async createPdfQuote(
    dto: CreatePdfQuoteDto,
    content: Buffer,
  ): Promise<QuoteResponseDto> {
    if (!isPdf(content)) {
      throw new BadRequestException(UNSUPPORTED_QUOTE_FILE_MESSAGE);
    }
    const { url } = await this.storageService.upload(
      toStoredPdf(content),
      QUOTE_PDFS_FOLDER,
    );

    return this.dataSource.transaction(async (manager) => {
      const order = await this.saveQuote(manager, dto, {
        source: OrderSource.Pdf,
        customerMessage: dto.message ?? null,
        dueDate: dto.dueDate ?? null,
        pdfUrl: url,
        minPrice: null,
        maxPrice: null,
      });
      return toResponse(order);
    });
  }

  private async saveQuote(
    manager: EntityManager,
    customerDto: QuoteCustomerDto,
    quote: QuoteData,
  ): Promise<Order> {
    const customer = await findOrCreateCustomer(manager, {
      type: CustomerType.Business,
      name: customerDto.name,
      document: customerDto.cnpj,
      email: customerDto.email,
      phone: customerDto.phone,
    });
    return manager.save(
      manager.create(Order, {
        ...quote,
        customerId: customer.customerId,
        status: OrderStatus.Requested,
      }),
    );
  }
}

function toResponse(order: Order): QuoteResponseDto {
  return {
    orderId: order.orderId,
    customerId: order.customerId,
    source: order.source,
    status: order.status,
    minPrice: order.minPrice,
    maxPrice: order.maxPrice,
  };
}
