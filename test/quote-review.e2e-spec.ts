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
import { OrderSource, OrderStatus } from '../src/orders/entities/order.entity';
import { QuoteSummaryDto } from '../src/quotes/dto/quote-summary.dto';
import {
  QUOTE_ALREADY_SOLD_MESSAGE,
  QUOTE_NOT_FOUND_MESSAGE,
  QUOTE_STATUS_NOT_ALLOWED_MESSAGE,
  QUOTE_VALUE_NOT_ALLOWED_MESSAGE,
  QUOTE_VALUE_REQUIRED_MESSAGE,
} from '../src/quotes/quote-review.service';

const PASSWORD = 'SenhaValida@123';
const DUE_DATE = '2030-01-15';

describe('Gestão dos orçamentos pedidos no site (e2e) - US21', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let employeeId: string;
  let employeeToken: string;
  let paintId: string;
  let materialId: string;

  const created = {
    orderIds: [] as string[],
    customerIds: [] as string[],
    catalogItemIds: [] as string[],
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    // Any employee of the team works the quotes, not only managers.
    const email = `orcamentos-${randomUUID()}@eldo.test`;
    [{ employee_id: employeeId }] = await dataSource.query<
      { employee_id: string }[]
    >(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Atendente Teste', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(PASSWORD), EmployeeRole.Employee],
    );
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    employeeToken = (loginRes.body as LoginResponseDto).accessToken;
  });

  beforeEach(async () => {
    paintId = await insertCatalogItem('paintType', 'Epóxi Teste', 50, null);
    materialId = await insertCatalogItem('partMaterial', 'Aço Teste', null, 1);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM orders WHERE customer_id = ANY($1)', [
      created.customerIds,
    ]);
    await dataSource.query(
      'DELETE FROM customers WHERE customer_id = ANY($1)',
      [created.customerIds],
    );
    await dataSource.query(
      'DELETE FROM catalog_items WHERE catalog_item_id = ANY($1)',
      [created.catalogItemIds],
    );
    Object.values(created).forEach((ids) => (ids.length = 0));
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM employees WHERE employee_id = $1', [
      employeeId,
    ]);
    await app.close();
  });

  const asEmployee = () => {
    const server = request(app.getHttpServer());
    const auth = `Bearer ${employeeToken}`;
    return {
      get: (url: string) => server.get(url).set('Authorization', auth),
      patch: (url: string) => server.patch(url).set('Authorization', auth),
      post: (url: string) => server.post(url).set('Authorization', auth),
    };
  };

  async function insertCatalogItem(
    type: 'paintType' | 'partMaterial',
    name: string,
    pricePerM2: number | null,
    priceFactor: number | null,
  ): Promise<string> {
    const [{ catalog_item_id: catalogItemId }] = await dataSource.query<
      { catalog_item_id: string }[]
    >(
      `INSERT INTO catalog_items (type, name, price_per_m2, price_factor)
       VALUES ($1, $2, $3, $4) RETURNING catalog_item_id`,
      [type, `${name} ${randomUUID().slice(0, 8)}`, pricePerM2, priceFactor],
    );
    created.catalogItemIds.push(catalogItemId);
    return catalogItemId;
  }

  async function insertCustomer(
    type: 'business' | 'individual' = 'business',
  ): Promise<string> {
    const document =
      type === 'business'
        ? String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199'
        : null;
    const [{ customer_id: customerId }] = await dataSource.query<
      { customer_id: string }[]
    >(
      `INSERT INTO customers (type, name, document, email, phone)
       VALUES ($1, 'Metalúrgica Teste', $2, 'contato@metalurgica.test', '61999999999')
       RETURNING customer_id`,
      [type, document],
    );
    created.customerIds.push(customerId);
    return customerId;
  }

  // A quote as the public form saves it: PDF or estimator, with the items of the
  // estimator (the catalog prices copied, ADR 0003).
  async function insertQuote(
    overrides: {
      source?: OrderSource;
      status?: OrderStatus;
      finalPrice?: number | null;
    } = {},
  ): Promise<string> {
    const source = overrides.source ?? OrderSource.Estimator;
    const customerId = await insertCustomer(
      source === OrderSource.Contact ? 'individual' : 'business',
    );
    const [{ order_id: orderId }] = await dataSource.query<
      { order_id: string }[]
    >(
      `INSERT INTO orders (customer_id, source, status, customer_message, min_price,
                           max_price, final_price, due_date)
       VALUES ($1, $2, $3, 'Preciso de 20 portões', 1000, 1150, $4, $5) RETURNING order_id`,
      [
        customerId,
        source,
        overrides.status ?? OrderStatus.Requested,
        overrides.finalPrice ?? null,
        DUE_DATE,
      ],
    );
    created.orderIds.push(orderId);
    if (source === OrderSource.Estimator) {
      await dataSource.query(
        `INSERT INTO order_items (order_id, material_catalog_item_id, paint_catalog_item_id,
                                  area_m2, quantity, price_per_m2, price_factor)
         VALUES ($1, $2, $3, 2.5, 4, 50, 1)`,
        [orderId, materialId, paintId],
      );
    }
    return orderId;
  }

  async function findQuote(
    orderId: string,
    query = '',
  ): Promise<QuoteSummaryDto | undefined> {
    const res = await asEmployee().get(`/quotes${query}`).expect(200);
    return (res.body as QuoteSummaryDto[]).find(
      (quote) => quote.orderId === orderId,
    );
  }

  describe('GET /quotes', () => {
    it('exige login', async () => {
      await request(app.getHttpServer()).get('/quotes').expect(401);
    });

    it('lista o orçamento do simulador com cliente, peças e faixa de preço', async () => {
      const orderId = await insertQuote();

      const quote = await findQuote(orderId);

      expect(quote).toMatchObject({
        orderId,
        status: OrderStatus.Requested,
        source: OrderSource.Estimator,
        customerName: 'Metalúrgica Teste',
        customerEmail: 'contato@metalurgica.test',
        customerPhone: '61999999999',
        customerMessage: 'Preciso de 20 portões',
        minPrice: 1000,
        maxPrice: 1150,
        finalPrice: null,
        dueDate: DUE_DATE,
        pdfUrl: null,
      });
      expect(quote?.items).toEqual([
        {
          paintName: expect.stringContaining('Epóxi Teste') as string,
          materialName: expect.stringContaining('Aço Teste') as string,
          areaM2: 2.5,
          quantity: 4,
        },
      ]);
    });

    it('lista o orçamento enviado por PDF sem peças', async () => {
      const orderId = await insertQuote({ source: OrderSource.Pdf });

      const quote = await findQuote(orderId);

      expect(quote).toMatchObject({ source: OrderSource.Pdf, items: [] });
    });

    it('não lista contatos de pessoa física nem pedidos que já viraram venda', async () => {
      const contactId = await insertQuote({ source: OrderSource.Contact });
      const soldId = await insertQuote({
        status: OrderStatus.Approved,
        finalPrice: 1000,
      });
      await launchSaleFrom(soldId).expect(201);

      expect(await findQuote(contactId)).toBeUndefined();
      expect(await findQuote(soldId)).toBeUndefined();
    });

    it('filtra pelo status e recusa um status que não é de orçamento', async () => {
      const requestedId = await insertQuote();
      const sentId = await insertQuote({
        status: OrderStatus.Sent,
        finalPrice: 1100,
      });

      expect(await findQuote(sentId, '?status=sent')).toBeDefined();
      expect(await findQuote(requestedId, '?status=sent')).toBeUndefined();
      await asEmployee().get('/quotes?status=queued').expect(400);
    });

    it('mostra o mais novo primeiro', async () => {
      const olderId = await insertQuote();
      await dataSource.query(
        `UPDATE orders SET created_at = now() - interval '1 day' WHERE order_id = $1`,
        [olderId],
      );
      const newerId = await insertQuote();

      const res = await asEmployee().get('/quotes').expect(200);
      const ids = (res.body as QuoteSummaryDto[]).map((quote) => quote.orderId);

      expect(ids.indexOf(newerId)).toBeLessThan(ids.indexOf(olderId));
    });
  });

  describe('PATCH /quotes/:orderId/status', () => {
    it('exige login', async () => {
      await request(app.getHttpServer())
        .patch(`/quotes/${randomUUID()}/status`)
        .send({ status: 'sent', finalPrice: 100 })
        .expect(401);
    });

    it('envia o valor ao cliente: guarda o valor e a data do envio', async () => {
      const orderId = await insertQuote();

      const res = await asEmployee()
        .patch(`/quotes/${orderId}/status`)
        .send({ status: 'sent', finalPrice: 1234.5 })
        .expect(200);

      expect(res.body).toMatchObject({
        orderId,
        status: OrderStatus.Sent,
        finalPrice: 1234.5,
      });
      expect((res.body as QuoteSummaryDto).sentAt).not.toBeNull();
    });

    it('exige o valor para enviar e recusa o valor nas outras respostas', async () => {
      const requestedId = await insertQuote();
      const sentId = await insertQuote({
        status: OrderStatus.Sent,
        finalPrice: 900,
      });

      const missing = await asEmployee()
        .patch(`/quotes/${requestedId}/status`)
        .send({ status: 'sent' })
        .expect(400);
      const extra = await asEmployee()
        .patch(`/quotes/${sentId}/status`)
        .send({ status: 'approved', finalPrice: 950 })
        .expect(400);

      expect((missing.body as { message: string }).message).toBe(
        QUOTE_VALUE_REQUIRED_MESSAGE,
      );
      expect((extra.body as { message: string }).message).toBe(
        QUOTE_VALUE_NOT_ALLOWED_MESSAGE,
      );
    });

    it('recusa valor negativo, zero e com mais de duas casas', async () => {
      const orderId = await insertQuote();

      for (const finalPrice of [-10, 0, 10.123]) {
        await asEmployee()
          .patch(`/quotes/${orderId}/status`)
          .send({ status: 'sent', finalPrice })
          .expect(400);
      }
    });

    it('registra a aprovação e a recusa do cliente', async () => {
      const toApprove = await insertQuote({
        status: OrderStatus.Sent,
        finalPrice: 1100,
      });
      const toReject = await insertQuote({
        status: OrderStatus.Sent,
        finalPrice: 1100,
      });

      const approved = await asEmployee()
        .patch(`/quotes/${toApprove}/status`)
        .send({ status: 'approved' })
        .expect(200);
      const rejected = await asEmployee()
        .patch(`/quotes/${toReject}/status`)
        .send({ status: 'rejected' })
        .expect(200);

      expect(approved.body).toMatchObject({
        status: OrderStatus.Approved,
        finalPrice: 1100,
      });
      expect(rejected.body).toMatchObject({ status: OrderStatus.Rejected });
    });

    it('não aprova um orçamento que ainda não teve o valor enviado', async () => {
      const orderId = await insertQuote();

      const res = await asEmployee()
        .patch(`/quotes/${orderId}/status`)
        .send({ status: 'approved' })
        .expect(409);

      expect((res.body as { message: string }).message).toBe(
        QUOTE_STATUS_NOT_ALLOWED_MESSAGE,
      );
    });

    it('permite enviar um novo valor e reabrir um orçamento recusado', async () => {
      const sentId = await insertQuote({
        status: OrderStatus.Sent,
        finalPrice: 1100,
      });
      const rejectedId = await insertQuote({
        status: OrderStatus.Rejected,
        finalPrice: 1100,
      });

      const resent = await asEmployee()
        .patch(`/quotes/${sentId}/status`)
        .send({ status: 'sent', finalPrice: 990 })
        .expect(200);
      const reopened = await asEmployee()
        .patch(`/quotes/${rejectedId}/status`)
        .send({ status: 'sent', finalPrice: 1000 })
        .expect(200);

      expect(resent.body).toMatchObject({ finalPrice: 990 });
      expect(reopened.body).toMatchObject({
        status: OrderStatus.Sent,
        finalPrice: 1000,
      });
    });

    it('recusa status que não é de resposta do orçamento', async () => {
      const orderId = await insertQuote();

      for (const status of ['requested', 'queued', 'completed', 'xyz']) {
        await asEmployee()
          .patch(`/quotes/${orderId}/status`)
          .send({ status })
          .expect(400);
      }
    });

    it('responde 404 para orçamento inexistente, id inválido e contato de pessoa física', async () => {
      const contactId = await insertQuote({ source: OrderSource.Contact });

      const missing = await asEmployee()
        .patch(`/quotes/${randomUUID()}/status`)
        .send({ status: 'rejected' })
        .expect(404);
      await asEmployee()
        .patch(`/quotes/${contactId}/status`)
        .send({ status: 'sent', finalPrice: 100 })
        .expect(404);
      await asEmployee()
        .patch('/quotes/nao-e-uuid/status')
        .send({ status: 'rejected' })
        .expect(400);

      expect((missing.body as { message: string }).message).toBe(
        QUOTE_NOT_FOUND_MESSAGE,
      );
    });

    it('não muda um orçamento que já virou venda', async () => {
      const orderId = await insertQuote({
        status: OrderStatus.Approved,
        finalPrice: 2000,
      });
      await launchSaleFrom(orderId).expect(201);

      const res = await asEmployee()
        .patch(`/quotes/${orderId}/status`)
        .send({ status: 'rejected' })
        .expect(409);

      expect((res.body as { message: string }).message).toBe(
        QUOTE_ALREADY_SOLD_MESSAGE,
      );
      expect(await findQuote(orderId)).toBeUndefined();
    });
  });

  function launchSaleFrom(orderId: string) {
    return asEmployee().post('/sales').send({
      orderId,
      sellerEmployeeId: employeeId,
      scope: 'Pintura de 20 portões',
      dueDate: DUE_DATE,
    });
  }

  it('do pedido ao lançamento: enviar o valor, aprovar e vender gera a OS em fila', async () => {
    const orderId = await insertQuote();

    await launchSaleFrom(orderId).expect(422);
    await asEmployee()
      .patch(`/quotes/${orderId}/status`)
      .send({ status: 'sent', finalPrice: 1500 })
      .expect(200);
    await launchSaleFrom(orderId).expect(422);
    await asEmployee()
      .patch(`/quotes/${orderId}/status`)
      .send({ status: 'approved' })
      .expect(200);
    const sale = await launchSaleFrom(orderId).expect(201);

    expect(sale.body).toMatchObject({
      orderId,
      status: OrderStatus.Queued,
      finalPrice: 1500,
    });
    expect((sale.body as { trackingCode: string }).trackingCode).toHaveLength(
      8,
    );
    await launchSaleFrom(orderId).expect(409);
  });
});
