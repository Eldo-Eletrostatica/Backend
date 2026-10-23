import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { todayInBrasilia } from '../common/brasilia-day';
import { Customer, CustomerType } from '../customers/entities/customer.entity';
import {
  Order,
  OrderStatus,
  SALE_STATUSES,
  TRACKING_CODE_LENGTH,
} from '../orders/entities/order.entity';
import { TRACKING_CODE_ALPHABET } from '../sales/tracking-code';
import {
  ServiceOrderProgressDto,
  ServiceOrderTrackingDto,
} from './dto/service-order-response.dto';

const OPEN_SERVICE_ORDER_STATUSES = [
  OrderStatus.Queued,
  OrderStatus.InProduction,
  OrderStatus.Finishing,
];

const TRACKING_CODE_PATTERN = new RegExp(
  `^[${TRACKING_CODE_ALPHABET}]{${TRACKING_CODE_LENGTH}}$`,
);

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
  ) {}

  findAll(): Promise<Order[]> {
    return this.orders.find({
      where: { status: In(SALE_STATUSES) },
      relations: { customer: true },
      order: { soldAt: 'DESC' },
    });
  }

  findOverdue(): Promise<Order[]> {
    return this.orders
      .createQueryBuilder('serviceOrder')
      .leftJoinAndSelect('serviceOrder.customer', 'customer')
      .where('serviceOrder.due_date < CAST(:today AS date)', {
        today: todayInBrasilia(),
      })
      .andWhere('serviceOrder.status IN (:...openStatuses)', {
        openStatuses: OPEN_SERVICE_ORDER_STATUSES,
      })
      .orderBy('serviceOrder.due_date', 'ASC')
      .getMany();
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.orders.findOneBy({ orderId });
    if (order === null || !SALE_STATUSES.includes(order.status)) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }
    order.status = status;
    // The Google review link (US18) waits for the group to define the URL
    // and the channel. Completing the order already records the date.
    order.completedAt = status === OrderStatus.Completed ? new Date() : null;
    return this.orders.save(order);
  }

  async findByTrackingCode(
    trackingCode: string,
  ): Promise<ServiceOrderTrackingDto> {
    if (!TRACKING_CODE_PATTERN.test(trackingCode)) {
      throw new BadRequestException('Protocolo inválido.');
    }
    const order = await this.orders.findOne({
      select: {
        orderId: true,
        trackingCode: true,
        status: true,
        dueDate: true,
      },
      where: { trackingCode },
    });
    if (
      order === null ||
      order.trackingCode === null ||
      order.dueDate === null
    ) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }
    return {
      trackingCode: order.trackingCode,
      status: order.status,
      dueDate: order.dueDate,
    };
  }

  async findByCustomerDocument(
    document: string,
  ): Promise<ServiceOrderProgressDto[]> {
    if (typeof document !== 'string') {
      throw new BadRequestException('CNPJ é obrigatório.');
    }
    const normalizedDocument = document.replace(/\D/g, '');
    if (normalizedDocument.length !== 14) {
      throw new BadRequestException('CNPJ inválido.');
    }
    const customer = await this.customers.findOneBy({
      document: normalizedDocument,
      type: CustomerType.Business,
    });
    if (customer === null) {
      return [];
    }
    const orders = await this.orders.find({
      select: { orderId: true, status: true, dueDate: true },
      where: {
        customerId: customer.customerId,
        status: In(OPEN_SERVICE_ORDER_STATUSES),
      },
      order: { soldAt: 'DESC' },
    });
    return orders.flatMap((order) =>
      order.dueDate === null
        ? []
        : [{ status: order.status, dueDate: order.dueDate }],
    );
  }
}
