import { EntityManager } from 'typeorm';
import { hashPassword } from '../../auth/password-hash';
import {
  CatalogItem,
  CatalogItemType,
} from '../../catalog-items/entities/catalog-item.entity';
import {
  Customer,
  CustomerType,
} from '../../customers/entities/customer.entity';
import {
  Employee,
  EmployeeRole,
} from '../../employees/entities/employee.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { generateTrackingCode } from '../../sales/tracking-code';
import dataSource from '../data-source';
import { buildDemoOrders, DemoPaintKey } from './demo-orders';

// Development data only, so the dashboard and the reports have something to
// show. Documented in the README, with the login of the demo manager.
export const DEMO_MANAGER_EMAIL = 'gestor.demo@eldo.com.br';
export const DEMO_MANAGER_PASSWORD = 'Gestor@2026';

// Every demo order has one item: 4 pieces of 2.5 m² of steel.
const DEMO_ITEM_AREA_M2 = 2.5;
const DEMO_ITEM_QUANTITY = 4;
const DEMO_DUE_DATE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// CNPJs that no real company uses, so the demo customers never collide with
// one typed in the internal area.
const DEMO_CNPJ_PREFIX = '9900000000';

const DEMO_PAINT_TYPES: Record<
  DemoPaintKey,
  { name: string; pricePerM2: number }
> = {
  epoxy: { name: 'Epóxi (Demo)', pricePerM2: 55 },
  polyester: { name: 'Poliéster (Demo)', pricePerM2: 48 },
  textured: {
    name: 'Pintura eletrostática a pó texturizada (Demo)',
    pricePerM2: 62,
  },
  primer: { name: 'Primer anticorrosivo (Demo)', pricePerM2: 35 },
};

const DEMO_PART_MATERIALS = [
  { name: 'Aço (Demo)', priceFactor: 1 },
  { name: 'Alumínio (Demo)', priceFactor: 1.2 },
];

async function createCatalog(manager: EntityManager) {
  const paintTypes = {} as Record<DemoPaintKey, CatalogItem>;
  for (const [key, paint] of Object.entries(DEMO_PAINT_TYPES)) {
    paintTypes[key as DemoPaintKey] = await manager.save(
      manager.create(CatalogItem, {
        type: CatalogItemType.PaintType,
        ...paint,
      }),
    );
  }
  const [steel] = await manager.save(
    DEMO_PART_MATERIALS.map((material) =>
      manager.create(CatalogItem, {
        type: CatalogItemType.PartMaterial,
        ...material,
      }),
    ),
  );
  return { paintTypes, steel };
}

async function seedDemoData(manager: EntityManager): Promise<void> {
  const demoManager = await manager.save(
    manager.create(Employee, {
      name: 'Gestor Demo',
      email: DEMO_MANAGER_EMAIL,
      passwordHash: await hashPassword(DEMO_MANAGER_PASSWORD),
      role: EmployeeRole.Manager,
    }),
  );
  const { paintTypes, steel } = await createCatalog(manager);

  const demoOrders = buildDemoOrders();
  for (const [index, demoOrder] of demoOrders.entries()) {
    const number = index + 1;
    const customer = await manager.save(
      manager.create(Customer, {
        type: CustomerType.Business,
        name: `Cliente Demo ${number}`,
        document: `${DEMO_CNPJ_PREFIX}${String(number).padStart(4, '0')}`,
        email: `cliente${number}@demo.eldo.com.br`,
        phone: '61999990000',
      }),
    );

    // The item copies the catalog price, as every order does (ADR 0003).
    const paint = paintTypes[demoOrder.paintKey];
    const pricePerM2 = paint.pricePerM2 ?? 0;
    const priceFactor = steel.priceFactor ?? 0;
    const itemPrice =
      DEMO_ITEM_AREA_M2 * DEMO_ITEM_QUANTITY * pricePerM2 * priceFactor;

    const sale = demoOrder.isSold
      ? {
          status: OrderStatus.Queued,
          sellerEmployeeId: demoManager.employeeId,
          finalPrice: itemPrice,
          // The demo manager has no commission rule.
          commission: 0,
          soldAt: demoOrder.createdAt,
          trackingCode: generateTrackingCode(),
          scope: 'Pintura de demonstração (Demo)',
          dueDate: new Date(
            demoOrder.createdAt.getTime() + DEMO_DUE_DATE_DAYS * DAY_MS,
          )
            .toISOString()
            .slice(0, 10),
        }
      : { status: OrderStatus.Requested };

    const order = await manager.save(
      manager.create(Order, {
        customerId: customer.customerId,
        source: demoOrder.source,
        createdAt: demoOrder.createdAt,
        ...sale,
      }),
    );
    await manager.save(
      manager.create(OrderItem, {
        orderId: order.orderId,
        paintCatalogItemId: paint.catalogItemId,
        materialCatalogItemId: steel.catalogItemId,
        areaM2: DEMO_ITEM_AREA_M2,
        quantity: DEMO_ITEM_QUANTITY,
        pricePerM2,
        priceFactor,
      }),
    );
  }
  console.log(
    `Dados de demonstração criados: ${demoOrders.length} pedidos. Login: ${DEMO_MANAGER_EMAIL} / ${DEMO_MANAGER_PASSWORD}`,
  );
}

// Fake orders must never reach the customer's database.
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Os dados de demonstração não rodam em produção.');
  }

  await dataSource.initialize();
  try {
    const hasDemoData = await dataSource.manager.exists(Employee, {
      where: { email: DEMO_MANAGER_EMAIL },
      withDeleted: true,
    });
    if (hasDemoData) {
      console.log('Os dados de demonstração já existem; nada foi alterado.');
      return;
    }
    await dataSource.transaction(seedDemoData);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
