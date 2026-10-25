import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Customer, CustomerType } from '../customers/entities/customer.entity';
import {
  Order,
  OrderSource,
  OrderStatus,
} from '../orders/entities/order.entity';
import { CONTACT_REQUEST_STATUSES } from './contact-request-status';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { ListContactRequestsQueryDto } from './dto/list-contact-requests-query.dto';
import { UpdateContactRequestStatusDto } from './dto/update-contact-request-status.dto';

export const CONTACT_REQUEST_NOT_FOUND_MESSAGE =
  'Solicitação de contato não encontrada.';
export const CONTACT_REQUEST_MOVED_ON_MESSAGE =
  'A solicitação já virou orçamento e não muda mais por aqui.';

@Injectable()
export class ContactRequestsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // The contact request is an order with source contact (ADR 0005). The
  // individual customer has no CPF, so every request registers its own
  // customer, and one transaction keeps it from staying without the order.
  async create(
    dto: CreateContactRequestDto,
  ): Promise<ContactRequestResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.save(
        manager.create(Customer, {
          type: CustomerType.Individual,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
        }),
      );
      const order = await manager.save(
        manager.create(Order, {
          customerId: customer.customerId,
          source: OrderSource.Contact,
          status: OrderStatus.Requested,
          customerMessage: dto.message,
        }),
      );
      return toResponse(Object.assign(order, { customer }));
    });
  }

  // Newest first, so the team sees the requests still waiting at the top.
  async findAll(
    query: ListContactRequestsQueryDto,
  ): Promise<ContactRequestResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: {
        source: OrderSource.Contact,
        status: query.status ?? In(CONTACT_REQUEST_STATUSES),
      },
      relations: { customer: true },
      order: { createdAt: 'DESC' },
    });
    return orders.map(toResponse);
  }

  async updateStatus(
    orderId: string,
    dto: UpdateContactRequestStatusDto,
  ): Promise<ContactRequestResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { orderId, source: OrderSource.Contact },
      relations: { customer: true },
    });
    if (order === null) {
      throw new NotFoundException(CONTACT_REQUEST_NOT_FOUND_MESSAGE);
    }
    if (!CONTACT_REQUEST_STATUSES.includes(order.status)) {
      throw new ConflictException(CONTACT_REQUEST_MOVED_ON_MESSAGE);
    }

    order.status = dto.status;
    return toResponse(await this.orderRepository.save(order));
  }
}

function toResponse(order: Order): ContactRequestResponseDto {
  return {
    orderId: order.orderId,
    status: order.status,
    name: order.customer.name,
    email: order.customer.email,
    phone: order.customer.phone,
    message: order.customerMessage ?? '',
    createdAt: order.createdAt,
  };
}
