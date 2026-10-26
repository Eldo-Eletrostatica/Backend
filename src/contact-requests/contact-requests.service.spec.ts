import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import {
  Order,
  OrderSource,
  OrderStatus,
} from '../orders/entities/order.entity';
import {
  CONTACT_REQUEST_MOVED_ON_MESSAGE,
  CONTACT_REQUEST_NOT_FOUND_MESSAGE,
  ContactRequestsService,
} from './contact-requests.service';

const ORDER_ID = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';

function buildContactRequest(status: OrderStatus): Order {
  return Object.assign(new Order(), {
    orderId: ORDER_ID,
    source: OrderSource.Contact,
    status,
    customerMessage: 'Quero pintar o portão',
    createdAt: new Date('2026-10-20T12:00:00Z'),
    customer: Object.assign(new Customer(), {
      name: 'Maria Souza',
      email: 'maria@email.com',
      phone: '61999999999',
    }),
  });
}

describe('ContactRequestsService', () => {
  let service: ContactRequestsService;
  let findOne: jest.Mock;
  let save: jest.Mock;

  beforeEach(async () => {
    findOne = jest.fn();
    save = jest.fn((order: Order) => Promise.resolve(order));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactRequestsService,
        { provide: DataSource, useValue: {} },
        { provide: getRepositoryToken(Order), useValue: { findOne, save } },
      ],
    }).compile();

    service = module.get<ContactRequestsService>(ContactRequestsService);
  });

  it.each([
    [OrderStatus.Requested, OrderStatus.Handled],
    [OrderStatus.Handled, OrderStatus.Requested],
  ])('muda uma solicitação de %s para %s', async (currentStatus, newStatus) => {
    findOne.mockResolvedValue(buildContactRequest(currentStatus));

    const response = await service.updateStatus(ORDER_ID, {
      status: newStatus,
    });

    expect(response.status).toBe(newStatus);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ status: newStatus }),
    );
  });

  it.each([
    [OrderStatus.Sent, OrderStatus.Handled],
    [OrderStatus.Queued, OrderStatus.Requested],
  ])(
    'não muda uma solicitação que já virou %s (pedido: %s)',
    async (currentStatus, newStatus) => {
      findOne.mockResolvedValue(buildContactRequest(currentStatus));

      await expect(
        service.updateStatus(ORDER_ID, { status: newStatus }),
      ).rejects.toThrow(
        new ConflictException(CONTACT_REQUEST_MOVED_ON_MESSAGE),
      );
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('busca só pedidos de origem contact e avisa quando não acha', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      service.updateStatus(ORDER_ID, { status: OrderStatus.Handled }),
    ).rejects.toThrow(new NotFoundException(CONTACT_REQUEST_NOT_FOUND_MESSAGE));
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: ORDER_ID, source: OrderSource.Contact },
      }),
    );
  });
});
