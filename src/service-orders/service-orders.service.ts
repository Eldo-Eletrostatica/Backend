import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { Not, Repository } from 'typeorm';
import { Customer, CustomerType } from '../customers/entities/customer.entity';
import { Employee } from '../employees/entities/employee.entity';
import {
  ServiceOrder,
  ServiceOrderStatus,
  TRACKING_CODE_LENGTH,
} from './entities/service-order.entity';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';

const TRACKING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly serviceOrderRepository: Repository<ServiceOrder>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(input: CreateServiceOrderDto) {
    const customerId = this.requiredString(input.customerId, 'customerId');
    const sellerEmployeeId = this.requiredString(
      input.sellerEmployeeId,
      'sellerEmployeeId',
    );
    const customer = await this.customerRepository.findOneBy({ customerId });
    const employee = await this.employeeRepository.findOneBy({
      employeeId: sellerEmployeeId,
    });
    if (!customer) throw new BadRequestException('Cliente não encontrado');
    if (!employee) throw new BadRequestException('Funcionário não encontrado');

    const order = this.serviceOrderRepository.create({
      customerId,
      sellerEmployeeId,
      quoteId: this.optionalString(input.quoteId),
      commissionRuleId: this.optionalString(input.commissionRuleId),
      total: this.nonNegativeNumber(input.total, 'total'),
      commission: this.nonNegativeNumber(input.commission, 'commission'),
      soldAt: this.parseDateTime(input.soldAt, 'soldAt'),
      scope: this.requiredString(input.scope, 'scope'),
      dueDate: this.parseDate(input.dueDate, 'dueDate'),
      status: ServiceOrderStatus.Queued,
      trackingCode: await this.generateTrackingCode(),
      completedAt: null,
    });
    return this.serviceOrderRepository.save(order);
  }

  async updateStatus(serviceOrderId: string, value: unknown) {
    if (
      !Object.values(ServiceOrderStatus).includes(value as ServiceOrderStatus)
    ) {
      throw new BadRequestException('Status inválido');
    }
    const order = await this.serviceOrderRepository.findOneBy({
      serviceOrderId,
    });
    if (!order) return null;
    order.status = value as ServiceOrderStatus;
    order.completedAt =
      order.status === ServiceOrderStatus.Completed ? new Date() : null;
    return this.serviceOrderRepository.save(order);
  }

  findByTrackingCode(trackingCode: string) {
    if (
      !new RegExp(
        `^[${TRACKING_CODE_ALPHABET}]{${TRACKING_CODE_LENGTH}}$`,
      ).test(trackingCode)
    ) {
      throw new BadRequestException('Protocolo inválido');
    }
    return this.serviceOrderRepository.findOne({
      select: { trackingCode: true, status: true, dueDate: true },
      where: { trackingCode },
    });
  }

  async findByCustomerDocument(document: string) {
    if (typeof document !== 'string')
      throw new BadRequestException('CNPJ é obrigatório');
    const normalizedDocument = document.replace(/\D/g, '');
    if (normalizedDocument.length !== 14)
      throw new BadRequestException('CNPJ inválido');
    const customer = await this.customerRepository.findOneBy({
      document: normalizedDocument,
      type: CustomerType.Business,
    });
    if (!customer) return [];
    const orders = await this.serviceOrderRepository.find({
      select: { status: true, dueDate: true },
      where: {
        customerId: customer.customerId,
        status: Not(ServiceOrderStatus.Completed),
      },
      order: { soldAt: 'DESC' },
    });
    return orders.map(({ status, dueDate }) => ({ status, dueDate }));
  }

  findAll() {
    return this.serviceOrderRepository.find({
      relations: { customer: true },
      order: { soldAt: 'DESC' },
    });
  }

  findOverdue() {
    return this.serviceOrderRepository
      .createQueryBuilder('serviceOrder')
      .leftJoinAndSelect('serviceOrder.customer', 'customer')
      .where('serviceOrder.due_date < CURRENT_DATE')
      .andWhere('serviceOrder.status <> :completed', {
        completed: ServiceOrderStatus.Completed,
      })
      .orderBy('serviceOrder.due_date', 'ASC')
      .getMany();
  }

  private async generateTrackingCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = Array.from(
        { length: TRACKING_CODE_LENGTH },
        () => TRACKING_CODE_ALPHABET[randomInt(TRACKING_CODE_ALPHABET.length)],
      ).join('');
      if (!(await this.serviceOrderRepository.existsBy({ trackingCode: code })))
        return code;
    }
    throw new Error('Não foi possível gerar um protocolo único');
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0)
      throw new BadRequestException(`${field} é obrigatório`);
    return value.trim();
  }

  private optionalString(value: unknown) {
    return value === undefined || value === null || value === ''
      ? null
      : this.requiredString(value, 'referência');
  }

  private nonNegativeNumber(value: unknown, field: string) {
    const parsed = Number(value);
    if (value === undefined || !Number.isFinite(parsed) || parsed < 0)
      throw new BadRequestException(`${field} deve ser maior ou igual a zero`);
    return parsed;
  }

  private parseDate(value: unknown, field: string) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException(
        `${field} deve estar no formato AAAA-MM-DD`,
      );
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException(`${field} inválido`);
    return value;
  }

  private parseDateTime(value: unknown, field: string) {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
      throw new BadRequestException(`${field} inválido`);
    return new Date(value);
  }
}
