import { EntityManager } from 'typeorm';
import { Customer, CustomerType } from '../customers/entities/customer.entity';

export interface CustomerData {
  type: CustomerType;
  name: string;
  document?: string;
  email: string;
  phone: string;
}

// A document already registered is the same customer coming back, so the order
// is linked to the existing record, whose data is kept as it is.
export async function findOrCreateCustomer(
  manager: EntityManager,
  data: CustomerData,
): Promise<Customer> {
  if (data.document !== undefined) {
    const existing = await manager.findOne(Customer, {
      where: { document: data.document },
    });
    if (existing !== null) {
      return existing;
    }
  }
  return manager.save(manager.create(Customer, data));
}
