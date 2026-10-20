import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  CatalogItem,
  CatalogItemType,
} from '../catalog-items/entities/catalog-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Employee } from '../employees/entities/employee.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import {
  Order,
  OrderSource,
  OrderStatus,
  SALE_STATUSES,
} from '../orders/entities/order.entity';
import { CommissionCalculatorService } from '../commission-rules/commission-calculator.service';
import { LaunchSaleDto } from './dto/launch-sale.dto';
import { SaleCustomerDto } from './dto/sale-customer.dto';
import { SaleItemDto } from './dto/sale-item.dto';
import { SaleResponseDto } from './dto/sale-response.dto';
import { generateTrackingCode } from './tracking-code';

const MAX_TRACKING_CODE_ATTEMPTS = 5;

type DirectSaleData = {
  customer: SaleCustomerDto;
  items: SaleItemDto[];
  finalPrice: number;
};

type SaleOrigin =
  | { kind: 'approvedOrder'; orderId: string }
  | ({ kind: 'direct' } & DirectSaleData);

// An order about to be sold, with the price the sale will be made at.
interface OrderToSell {
  order: Order;
  finalPrice: number;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commissionCalculatorService: CommissionCalculatorService,
  ) {}

  // Sale, tracking code and service order are the same row (ADR 0005), but the
  // customer, the items and the order are separate writes: one transaction
  // keeps a failure from leaving a customer or an order half launched.
  async launchSale(dto: LaunchSaleDto): Promise<SaleResponseDto> {
    const origin = this.resolveOrigin(dto);

    return this.dataSource.transaction(async (manager) => {
      const seller = await this.findSeller(manager, dto.sellerEmployeeId);
      const { order, finalPrice } =
        origin.kind === 'approvedOrder'
          ? await this.lockApprovedOrder(manager, origin.orderId)
          : await this.createDirectSaleOrder(manager, origin);

      const sale = {
        sellerEmployeeId: seller.employeeId,
        finalPrice,
        commission: await this.commissionCalculatorService.calculateCommission(
          seller.employeeId,
          finalPrice,
          manager,
        ),
        soldAt: new Date(),
        trackingCode: await this.generateUniqueTrackingCode(manager),
        scope: dto.scope,
        dueDate: dto.dueDate,
      };
      await manager.save(
        Object.assign(order, sale, { status: OrderStatus.Queued }),
      );

      return {
        orderId: order.orderId,
        customerId: order.customerId,
        status: OrderStatus.Queued,
        ...sale,
      };
    });
  }

  private resolveOrigin(dto: LaunchSaleDto): SaleOrigin {
    const { orderId, customer, items, finalPrice } = dto;
    const hasDirectSaleData =
      customer !== undefined || items !== undefined || finalPrice !== undefined;

    if (orderId !== undefined) {
      if (hasDirectSaleData) {
        throw new BadRequestException(
          'Informe o orçamento aprovado ou os dados da venda direta, não os dois.',
        );
      }
      return { kind: 'approvedOrder', orderId };
    }

    if (
      customer === undefined ||
      items === undefined ||
      finalPrice === undefined
    ) {
      throw new BadRequestException(
        'Sem orçamento aprovado, informe o cliente, os itens e o valor da venda.',
      );
    }
    return { kind: 'direct', customer, items, finalPrice };
  }

  private async findSeller(
    manager: EntityManager,
    employeeId: string,
  ): Promise<Employee> {
    const seller = await manager.findOne(Employee, { where: { employeeId } });
    if (seller === null) {
      throw new NotFoundException('Vendedor não encontrado.');
    }
    return seller;
  }

  // The row lock makes a second launch of the same quote wait for the first
  // one and then see it already converted, instead of both passing the check.
  private async lockApprovedOrder(
    manager: EntityManager,
    orderId: string,
  ): Promise<OrderToSell> {
    const order = await manager.findOne(Order, {
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (order === null) {
      throw new NotFoundException('Orçamento não encontrado.');
    }
    if (SALE_STATUSES.includes(order.status)) {
      throw new ConflictException('O orçamento já foi convertido em venda.');
    }
    if (order.status !== OrderStatus.Approved) {
      throw new UnprocessableEntityException(
        'Só um orçamento aprovado pode virar venda.',
      );
    }
    if (order.finalPrice === null) {
      throw new UnprocessableEntityException(
        'O orçamento aprovado não tem valor final.',
      );
    }
    return { order, finalPrice: order.finalPrice };
  }

  private async createDirectSaleOrder(
    manager: EntityManager,
    { customer: customerDto, items, finalPrice }: DirectSaleData,
  ): Promise<OrderToSell> {
    const orderItems = await this.buildOrderItems(manager, items);
    const customer = await this.findOrCreateCustomer(manager, customerDto);

    const order = await manager.save(
      manager.create(Order, {
        customerId: customer.customerId,
        source: OrderSource.Internal,
        status: OrderStatus.Approved,
        finalPrice,
      }),
    );
    for (const orderItem of orderItems) {
      orderItem.orderId = order.orderId;
    }
    await manager.save(orderItems);
    return { order, finalPrice };
  }

  // A document already registered is the same customer coming back.
  private async findOrCreateCustomer(
    manager: EntityManager,
    dto: SaleCustomerDto,
  ): Promise<Customer> {
    if (dto.document !== undefined) {
      const existing = await manager.findOne(Customer, {
        where: { document: dto.document },
      });
      if (existing !== null) {
        return existing;
      }
    }
    return manager.save(manager.create(Customer, dto));
  }

  // Both foreign keys point to catalog_items, so the database cannot tell a
  // paint type from a material: the type is checked here. The prices are
  // copied into the item and stay frozen (ADR 0003).
  private async buildOrderItems(
    manager: EntityManager,
    items: SaleItemDto[],
  ): Promise<OrderItem[]> {
    const catalogItemIds = items.flatMap((item) => [
      item.materialCatalogItemId,
      item.paintCatalogItemId,
    ]);
    const catalogItems = await manager.find(CatalogItem, {
      where: { catalogItemId: In(catalogItemIds), isActive: true },
    });
    const catalogItemById = new Map(
      catalogItems.map((catalogItem) => [
        catalogItem.catalogItemId,
        catalogItem,
      ]),
    );

    return items.map((item) => {
      const paint = catalogItemById.get(item.paintCatalogItemId);
      const material = catalogItemById.get(item.materialCatalogItemId);
      if (
        paint?.type !== CatalogItemType.PaintType ||
        paint.pricePerM2 === null
      ) {
        throw new UnprocessableEntityException(
          'Tipo de pintura inexistente, desativado ou de outro tipo.',
        );
      }
      if (
        material?.type !== CatalogItemType.PartMaterial ||
        material.priceFactor === null
      ) {
        throw new UnprocessableEntityException(
          'Material da peça inexistente, desativado ou de outro tipo.',
        );
      }
      return manager.create(OrderItem, {
        materialCatalogItemId: item.materialCatalogItemId,
        paintCatalogItemId: item.paintCatalogItemId,
        areaM2: item.areaM2,
        quantity: item.quantity,
        pricePerM2: paint.pricePerM2,
        priceFactor: material.priceFactor,
      });
    });
  }

  // The unique index is the last line of defense; checking first avoids
  // aborting the transaction on the rare collision.
  private async generateUniqueTrackingCode(
    manager: EntityManager,
  ): Promise<string> {
    for (let attempt = 0; attempt < MAX_TRACKING_CODE_ATTEMPTS; attempt++) {
      const trackingCode = generateTrackingCode();
      if (!(await manager.exists(Order, { where: { trackingCode } }))) {
        return trackingCode;
      }
    }
    throw new InternalServerErrorException(
      'Não foi possível gerar um protocolo único.',
    );
  }
}
