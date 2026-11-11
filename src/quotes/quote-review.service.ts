import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import {
  Order,
  OrderSource,
  OrderStatus,
  SALE_STATUSES,
} from '../orders/entities/order.entity';
import { ListQuotesQueryDto } from './dto/list-quotes-query.dto';
import { QuoteSummaryDto } from './dto/quote-summary.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { canMoveQuote, QUOTE_STATUSES } from './quote-status';

export const QUOTE_NOT_FOUND_MESSAGE = 'Orçamento não encontrado.';
export const QUOTE_ALREADY_SOLD_MESSAGE =
  'O orçamento já virou venda e não muda mais por aqui.';
export const QUOTE_STATUS_NOT_ALLOWED_MESSAGE =
  'Esta mudança de status não é permitida para o orçamento.';
export const QUOTE_VALUE_REQUIRED_MESSAGE =
  'Informe o valor final para enviar o orçamento ao cliente.';
export const QUOTE_VALUE_NOT_ALLOWED_MESSAGE =
  'O valor final só é informado ao enviar o orçamento.';

// The quotes asked on the public form (estimator or PDF) are the ones the team
// answers here. A contact request is another stage of the order and has its
// own screen.
const QUOTE_SOURCES = [OrderSource.Estimator, OrderSource.Pdf];

// The team works the quotes asked on the site: sees them, sends the value to
// the customer and records the answer (US21 sells only an approved one).
@Injectable()
export class QuoteReviewService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  // Newest first, so the requests still waiting come on top.
  async findAll(query: ListQuotesQueryDto): Promise<QuoteSummaryDto[]> {
    const orders = await this.orderRepository.find({
      where: {
        source: In(QUOTE_SOURCES),
        status: query.status ?? In(QUOTE_STATUSES),
      },
      relations: { customer: true },
      order: { createdAt: 'DESC' },
    });
    return this.toSummaries(orders);
  }

  async updateStatus(
    orderId: string,
    dto: UpdateQuoteStatusDto,
  ): Promise<QuoteSummaryDto> {
    const order = await this.orderRepository.findOne({
      where: { orderId, source: In(QUOTE_SOURCES) },
      relations: { customer: true },
    });
    if (order === null) {
      throw new NotFoundException(QUOTE_NOT_FOUND_MESSAGE);
    }
    if (SALE_STATUSES.includes(order.status)) {
      throw new ConflictException(QUOTE_ALREADY_SOLD_MESSAGE);
    }
    if (!canMoveQuote(order.status, dto.status)) {
      throw new ConflictException(QUOTE_STATUS_NOT_ALLOWED_MESSAGE);
    }

    if (dto.status === OrderStatus.Sent) {
      if (dto.finalPrice === undefined) {
        throw new BadRequestException(QUOTE_VALUE_REQUIRED_MESSAGE);
      }
      order.finalPrice = dto.finalPrice;
      order.sentAt = new Date();
    } else if (dto.finalPrice !== undefined) {
      throw new BadRequestException(QUOTE_VALUE_NOT_ALLOWED_MESSAGE);
    }
    order.status = dto.status;

    const [summary] = await this.toSummaries([
      await this.orderRepository.save(order),
    ]);
    return summary;
  }

  // The items keep a copy of the catalog names through the relation, and the
  // catalog item can be deleted later, so the deleted ones are read too.
  private async toSummaries(orders: Order[]): Promise<QuoteSummaryDto[]> {
    const items =
      orders.length === 0
        ? []
        : await this.orderItemRepository.find({
            where: { orderId: In(orders.map((order) => order.orderId)) },
            relations: { paintCatalogItem: true, materialCatalogItem: true },
            order: { createdAt: 'ASC' },
            withDeleted: true,
          });

    return orders.map((order) => ({
      orderId: order.orderId,
      status: order.status,
      source: order.source,
      customerName: order.customer.name,
      customerDocument: order.customer.document,
      customerEmail: order.customer.email,
      customerPhone: order.customer.phone,
      customerMessage: order.customerMessage,
      pdfUrl: order.pdfUrl,
      minPrice: order.minPrice,
      maxPrice: order.maxPrice,
      finalPrice: order.finalPrice,
      dueDate: order.dueDate,
      sentAt: order.sentAt,
      createdAt: order.createdAt,
      items: items
        .filter((item) => item.orderId === order.orderId)
        .map((item) => ({
          paintName: item.paintCatalogItem.name,
          materialName: item.materialCatalogItem.name,
          areaM2: item.areaM2,
          quantity: item.quantity,
        })),
    }));
  }
}
