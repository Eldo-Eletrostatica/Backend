import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { EmployeeRole } from '../src/employees/entities/employee.entity';
import {
  OrderStatus,
  SALE_STATUSES,
} from '../src/orders/entities/order.entity';

// Alphabet of ADR 0001: no 0, O, 1 or I, which are easy to mix up when typed.
const TRACKING_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const DUE_DATE = '2030-01-15';
const SCOPE = 'Pintura eletrostática de 20 portões em epóxi preto fosco';

type CommissionRule = { type: 'percentage' | 'fixed'; value: number } | null;

interface SaleResponse {
  orderId: string;
  customerId: string;
  sellerEmployeeId: string;
  status: string;
  trackingCode: string;
  finalPrice: number;
  commission: number;
  soldAt: string;
  scope: string;
  dueDate: string;
}

describe('Lançamento de venda (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authEmployeeId: string;
  let authToken: string;

  const created = {
    orderIds: [] as string[],
    customerIds: [] as string[],
    employeeIds: [] as string[],
    catalogItemIds: [] as string[],
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const email = `auth-${randomUUID()}@eldo.test`;
    const password = 'SenhaValida@123';
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Atendente', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(password), EmployeeRole.Employee],
    );
    authEmployeeId = rows[0].employee_id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    authToken = (loginRes.body as LoginResponseDto).accessToken;
  });

  // The service commits its own transaction, so the rows created by each test
  // are removed here instead of rolled back.
  afterEach(async () => {
    await dataSource.query(
      `DELETE FROM orders
        WHERE order_id = ANY($1) OR customer_id = ANY($2) OR seller_employee_id = ANY($3)`,
      [created.orderIds, created.customerIds, created.employeeIds],
    );
    await dataSource.query(
      'DELETE FROM customers WHERE customer_id = ANY($1)',
      [created.customerIds],
    );
    await dataSource.query(
      'DELETE FROM employees WHERE employee_id = ANY($1)',
      [created.employeeIds],
    );
    await dataSource.query(
      'DELETE FROM catalog_items WHERE catalog_item_id = ANY($1)',
      [created.catalogItemIds],
    );
    Object.values(created).forEach((ids) => (ids.length = 0));
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM employees WHERE employee_id = $1', [
      authEmployeeId,
    ]);
    await app.close();
  });

  function randomDocument(): string {
    return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
  }

  async function insertEmployee(rule: CommissionRule = null): Promise<string> {
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash, commission_type, commission_value)
       VALUES ('Vendedor', $1, 'hash', $2, $3) RETURNING employee_id`,
      [`${randomUUID()}@eldo.test`, rule?.type ?? null, rule?.value ?? null],
    );
    created.employeeIds.push(rows[0].employee_id);
    return rows[0].employee_id;
  }

  async function insertCustomer(): Promise<string> {
    const rows = await dataSource.query<{ customer_id: string }[]>(
      `INSERT INTO customers (type, name, document, email, phone)
       VALUES ('business', 'ACME', $1, 'contato@acme.test', '61999999999')
       RETURNING customer_id`,
      [randomDocument()],
    );
    created.customerIds.push(rows[0].customer_id);
    return rows[0].customer_id;
  }

  // An order in a sale status needs every sale column (CHK_orders_sale), so the
  // seeded row is already a complete sale.
  async function insertOrder(
    status: OrderStatus,
    finalPrice = 1000,
  ): Promise<string> {
    const customerId = await insertCustomer();
    const isSale = SALE_STATUSES.includes(status);
    const sellerEmployeeId = isSale ? await insertEmployee() : null;
    const rows = await dataSource.query<{ order_id: string }[]>(
      `INSERT INTO orders (customer_id, source, status, final_price, seller_employee_id,
                           commission, sold_at, tracking_code, scope, due_date)
       VALUES ($1, 'pdf', $2, $3, $4, $5, $6, $7, $8, $9) RETURNING order_id`,
      [
        customerId,
        status,
        finalPrice,
        sellerEmployeeId,
        isSale ? 0 : null,
        isSale ? new Date() : null,
        isSale ? randomUUID().slice(0, 8).toUpperCase() : null,
        isSale ? SCOPE : null,
        isSale ? DUE_DATE : null,
      ],
    );
    created.orderIds.push(rows[0].order_id);
    return rows[0].order_id;
  }

  function launchSale(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .send(body);
  }

  describe('a partir de um orçamento aprovado', () => {
    it('cria a venda, gera o protocolo e deixa a OS em fila', async () => {
      const orderId = await insertOrder(OrderStatus.Approved, 1500);
      const sellerEmployeeId = await insertEmployee();

      const response = await launchSale({
        orderId,
        sellerEmployeeId,
        scope: SCOPE,
        dueDate: DUE_DATE,
      }).expect(201);

      const sale = response.body as SaleResponse;
      expect(sale).toMatchObject({
        orderId,
        sellerEmployeeId,
        status: OrderStatus.Queued,
        finalPrice: 1500,
        scope: SCOPE,
        dueDate: DUE_DATE,
      });
      expect(sale.trackingCode).toMatch(TRACKING_CODE_PATTERN);
    });

    it.each([
      ['percentage', 5, 1000, 50],
      ['percentage', 7.5, 1234.56, 92.59],
      ['fixed', 120, 1000, 120],
    ] as const)(
      'calcula a comissão de vendedor com regra %s de %s sobre %s: %s',
      async (type, value, finalPrice, expectedCommission) => {
        const orderId = await insertOrder(OrderStatus.Approved, finalPrice);
        const sellerEmployeeId = await insertEmployee({ type, value });

        const response = await launchSale({
          orderId,
          sellerEmployeeId,
          scope: SCOPE,
          dueDate: DUE_DATE,
        }).expect(201);

        expect((response.body as SaleResponse).commission).toBe(
          expectedCommission,
        );
      },
    );

    it('grava comissão zero quando o vendedor não tem regra', async () => {
      const orderId = await insertOrder(OrderStatus.Approved, 1000);
      const sellerEmployeeId = await insertEmployee(null);

      const response = await launchSale({
        orderId,
        sellerEmployeeId,
        scope: SCOPE,
        dueDate: DUE_DATE,
      }).expect(201);

      expect((response.body as SaleResponse).commission).toBe(0);
    });
  });

  describe('orçamento que não pode virar venda', () => {
    const ALREADY_CONVERTED = 'O orçamento já foi convertido em venda.';
    const NOT_APPROVED = 'Só um orçamento aprovado pode virar venda.';

    it('recusa a segunda venda do mesmo orçamento', async () => {
      const orderId = await insertOrder(OrderStatus.Approved);
      const sellerEmployeeId = await insertEmployee();
      const body = {
        orderId,
        sellerEmployeeId,
        scope: SCOPE,
        dueDate: DUE_DATE,
      };

      await launchSale(body).expect(201);
      const second = await launchSale(body).expect(409);

      expect((second.body as { message: string }).message).toBe(
        ALREADY_CONVERTED,
      );
    });

    it('deixa passar só uma de duas vendas simultâneas do mesmo orçamento', async () => {
      const orderId = await insertOrder(OrderStatus.Approved);
      const sellerEmployeeId = await insertEmployee();
      const body = {
        orderId,
        sellerEmployeeId,
        scope: SCOPE,
        dueDate: DUE_DATE,
      };

      const responses = await Promise.all([launchSale(body), launchSale(body)]);

      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
    });

    it.each([
      [OrderStatus.Queued, 409, ALREADY_CONVERTED],
      [OrderStatus.Completed, 409, ALREADY_CONVERTED],
      [OrderStatus.Requested, 422, NOT_APPROVED],
      [OrderStatus.Sent, 422, NOT_APPROVED],
      [OrderStatus.Rejected, 422, NOT_APPROVED],
    ])(
      'recusa o pedido %s com %s',
      async (status, expectedStatus, expectedMessage) => {
        const orderId = await insertOrder(status);
        const sellerEmployeeId = await insertEmployee();

        const response = await launchSale({
          orderId,
          sellerEmployeeId,
          scope: SCOPE,
          dueDate: DUE_DATE,
        }).expect(expectedStatus);

        expect((response.body as { message: string }).message).toBe(
          expectedMessage,
        );
      },
    );

    it.each([
      ['o orçamento', 'Orçamento não encontrado.'],
      ['o vendedor', 'Vendedor não encontrado.'],
    ])(
      'responde 404 quando %s não existe',
      async (missing, expectedMessage) => {
        const existingOrderId = await insertOrder(OrderStatus.Approved);
        const existingSellerId = await insertEmployee();

        const response = await launchSale({
          orderId: missing === 'o orçamento' ? randomUUID() : existingOrderId,
          sellerEmployeeId:
            missing === 'o vendedor' ? randomUUID() : existingSellerId,
          scope: SCOPE,
          dueDate: DUE_DATE,
        }).expect(404);

        expect((response.body as { message: string }).message).toBe(
          expectedMessage,
        );
      },
    );
  });

  describe('venda direta, sem orçamento prévio', () => {
    const PAINT_PRICE_PER_M2 = 50;
    const MATERIAL_FACTOR = 1.2;

    async function insertCatalogItem(
      type: 'paintType' | 'partMaterial',
      isActive = true,
    ): Promise<string> {
      const rows = await dataSource.query<{ catalog_item_id: string }[]>(
        `INSERT INTO catalog_items (type, name, price_per_m2, price_factor, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING catalog_item_id`,
        [
          type,
          type === 'paintType' ? 'Epóxi' : 'Aço',
          type === 'paintType' ? PAINT_PRICE_PER_M2 : null,
          type === 'partMaterial' ? MATERIAL_FACTOR : null,
          isActive,
        ],
      );
      created.catalogItemIds.push(rows[0].catalog_item_id);
      return rows[0].catalog_item_id;
    }

    async function directSaleBody(
      overrides: Record<string, unknown> = {},
    ): Promise<Record<string, unknown>> {
      return {
        sellerEmployeeId: await insertEmployee({
          type: 'percentage',
          value: 5,
        }),
        scope: SCOPE,
        dueDate: DUE_DATE,
        finalPrice: 800,
        customer: {
          type: 'business',
          name: 'Serralheria Nova',
          document: randomDocument(),
          email: 'contato@serralheria.test',
          phone: '61988887777',
        },
        items: [
          {
            materialCatalogItemId: await insertCatalogItem('partMaterial'),
            paintCatalogItemId: await insertCatalogItem('paintType'),
            areaM2: 2.5,
            quantity: 4,
          },
        ],
        ...overrides,
      };
    }

    function trackCustomer(response: request.Response): void {
      const customerId = (response.body as Partial<SaleResponse>).customerId;
      if (customerId !== undefined) {
        created.customerIds.push(customerId);
      }
    }

    it('cadastra o cliente novo junto com a venda e deixa a OS em fila', async () => {
      const body = await directSaleBody();

      const response = await launchSale(body).expect(201);
      trackCustomer(response);

      const sale = response.body as SaleResponse;
      expect(sale).toMatchObject({
        status: OrderStatus.Queued,
        finalPrice: 800,
        commission: 40,
        scope: SCOPE,
        dueDate: DUE_DATE,
      });
      expect(sale.trackingCode).toMatch(TRACKING_CODE_PATTERN);
      const customers = await dataSource.query<{ name: string }[]>(
        'SELECT name FROM customers WHERE customer_id = $1',
        [sale.customerId],
      );
      expect(customers).toEqual([{ name: 'Serralheria Nova' }]);
    });

    it('congela o preço por m² e o fator do catálogo nos itens', async () => {
      const response = await launchSale(await directSaleBody()).expect(201);
      trackCustomer(response);

      const items = await dataSource.query<
        {
          price_per_m2: number;
          price_factor: number;
          area_m2: number;
          quantity: number;
        }[]
      >(
        `SELECT price_per_m2::float AS price_per_m2, price_factor::float AS price_factor,
                area_m2::float AS area_m2, quantity
           FROM order_items WHERE order_id = $1`,
        [(response.body as SaleResponse).orderId],
      );
      expect(items).toEqual([
        {
          price_per_m2: PAINT_PRICE_PER_M2,
          price_factor: MATERIAL_FACTOR,
          area_m2: 2.5,
          quantity: 4,
        },
      ]);
    });

    it('reaproveita o cliente que já tem o mesmo documento', async () => {
      const existingCustomerId = await insertCustomer();
      const rows = await dataSource.query<{ document: string }[]>(
        'SELECT document FROM customers WHERE customer_id = $1',
        [existingCustomerId],
      );
      const body = await directSaleBody({
        customer: {
          type: 'business',
          name: 'Outro nome digitado',
          document: rows[0].document,
          email: 'novo@serralheria.test',
          phone: '61977776666',
        },
      });

      const response = await launchSale(body).expect(201);

      expect((response.body as SaleResponse).customerId).toBe(
        existingCustomerId,
      );
    });

    it('aceita cliente PF sem documento', async () => {
      const body = await directSaleBody({
        customer: {
          type: 'individual',
          name: 'Bia',
          email: 'bia@email.test',
          phone: '61966665555',
        },
      });

      const response = await launchSale(body).expect(201);
      trackCustomer(response);
    });

    it.each([
      ['sem vendedor', { sellerEmployeeId: undefined }],
      ['sem escopo', { scope: '' }],
      ['com prazo que não é data', { dueDate: '2030-02-31' }],
      ['com prazo em outro formato', { dueDate: '15/01/2030' }],
      ['sem cliente', { customer: undefined }],
      ['sem itens', { items: [] }],
      ['sem valor', { finalPrice: undefined }],
      ['com valor negativo', { finalPrice: -10 }],
      [
        'com cliente PJ sem CNPJ',
        {
          customer: {
            type: 'business',
            name: 'ACME',
            email: 'a@acme.test',
            phone: '61955554444',
          },
        },
      ],
      [
        'com orçamento e dados de venda direta juntos',
        { orderId: randomUUID() },
      ],
    ])('rejeita a venda %s com 400', async (_case, overrides) => {
      const body = await directSaleBody(overrides);

      await launchSale(body).expect(400);
    });

    it.each([
      ['de pintura trocado com o de material', 'swapped'],
      ['de material desativado', 'inactive'],
    ])('rejeita item %s com 422', async (_case, problem) => {
      const body = await directSaleBody();
      const [item] = body.items as Record<string, unknown>[];
      if (problem === 'swapped') {
        [item.materialCatalogItemId, item.paintCatalogItemId] = [
          item.paintCatalogItemId,
          item.materialCatalogItemId,
        ];
      } else {
        item.materialCatalogItemId = await insertCatalogItem(
          'partMaterial',
          false,
        );
      }

      await launchSale(body).expect(422);
    });
  });
});
