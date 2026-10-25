import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { QuoteResponseDto } from '../src/quotes/dto/quote-response.dto';
import { ESTIMATOR_DISABLED_MESSAGE } from '../src/quotes/quotes.service';

const PDF = Buffer.from('%PDF-1.7\n1 0 obj << >> endobj\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DUE_DATE = '2030-01-15';

interface EstimatorSettingsRow {
  is_estimator_enabled: boolean;
  negotiation_margin: string;
}

describe('Orçamento PJ (e2e) - US07', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  // Catalog of the tests: epoxy at R$ 50/m², steel with factor 1.
  let epoxyId: string;
  let steelId: string;
  let developmentSettings: EstimatorSettingsRow;

  const created = {
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

    // site_settings has a single row shared with the development database.
    [developmentSettings] = await dataSource.query<EstimatorSettingsRow[]>(
      'SELECT is_estimator_enabled, negotiation_margin FROM site_settings',
    );
  });

  beforeEach(async () => {
    await setEstimator(true, 15);
    epoxyId = await insertCatalogItem('paintType', 'Epóxi Teste', 50, null);
    steelId = await insertCatalogItem('partMaterial', 'Aço Teste', null, 1);
  });

  // Orders go first: their items keep the catalog items from being deleted,
  // and the orders keep the customers.
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
    await dataSource.query(
      'UPDATE site_settings SET is_estimator_enabled = $1, negotiation_margin = $2',
      [
        developmentSettings.is_estimator_enabled,
        developmentSettings.negotiation_margin,
      ],
    );
    await app.close();
  });

  async function setEstimator(isEnabled: boolean, negotiationMargin: number) {
    await dataSource.query(
      'UPDATE site_settings SET is_estimator_enabled = $1, negotiation_margin = $2',
      [isEnabled, negotiationMargin],
    );
  }

  async function insertCatalogItem(
    type: 'paintType' | 'partMaterial',
    name: string,
    pricePerM2: number | null,
    priceFactor: number | null,
    isActive = true,
  ): Promise<string> {
    const [{ catalog_item_id: catalogItemId }] = await dataSource.query<
      { catalog_item_id: string }[]
    >(
      `INSERT INTO catalog_items (type, name, price_per_m2, price_factor, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING catalog_item_id`,
      [
        type,
        `${name} ${randomUUID().slice(0, 8)}`,
        pricePerM2,
        priceFactor,
        isActive,
      ],
    );
    created.catalogItemIds.push(catalogItemId);
    return catalogItemId;
  }

  function randomCnpj(): string {
    return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
  }

  function customer(cnpj = randomCnpj()) {
    return {
      name: 'Metalúrgica Teste Ltda',
      cnpj,
      email: `compras-${cnpj}@teste.com`,
      phone: '61999999999',
    };
  }

  function item(overrides: Record<string, unknown> = {}) {
    return {
      paintCatalogItemId: epoxyId,
      materialCatalogItemId: steelId,
      areaM2: 2,
      quantity: 3,
      ...overrides,
    };
  }

  async function requestEstimate(body: Record<string, unknown>) {
    const res = await request(app.getHttpServer())
      .post('/quotes/estimator')
      .send(body);
    const quote = res.body as QuoteResponseDto;
    if (res.status === 201) {
      created.customerIds.push(quote.customerId);
    }
    return res;
  }

  function uploadPdf(content: Buffer, filename: string, contentType: string) {
    const fields = customer();
    return request(app.getHttpServer())
      .post('/quotes/pdf')
      .field('name', fields.name)
      .field('cnpj', fields.cnpj)
      .field('email', fields.email)
      .field('phone', fields.phone)
      .attach('file', content, { filename, contentType });
  }

  describe('Critérios de Aceite da US07', () => {
    it('Critério 1: devolve a faixa do preço calculado até o preço com a margem', async () => {
      const res = await requestEstimate({
        customer: customer(),
        items: [item(), item({ quantity: 1 })],
        dueDate: DUE_DATE,
      });

      // (2 m² × 3 + 2 m² × 1) × R$ 50 × 1,0 = R$ 400; + 15% = R$ 460.
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        source: 'estimator',
        status: 'requested',
        minPrice: 400,
        maxPrice: 460,
      });
    });

    it('Critério 1: guarda a faixa, o prazo e os preços do catálogo no orçamento (ADR 0003)', async () => {
      const res = await requestEstimate({
        customer: customer(),
        items: [item()],
        dueDate: DUE_DATE,
        message: 'Portões da fábrica',
      });
      const { orderId } = res.body as QuoteResponseDto;

      const [order] = await dataSource.query<Record<string, unknown>[]>(
        `SELECT source, status, min_price, max_price, due_date::text, customer_message
           FROM orders WHERE order_id = $1`,
        [orderId],
      );
      const items = await dataSource.query<Record<string, unknown>[]>(
        'SELECT price_per_m2, price_factor FROM order_items WHERE order_id = $1',
        [orderId],
      );
      expect(order).toEqual({
        source: 'estimator',
        status: 'requested',
        min_price: '300.00',
        max_price: '345.00',
        due_date: DUE_DATE,
        customer_message: 'Portões da fábrica',
      });
      expect(items).toEqual([{ price_per_m2: '50.00', price_factor: '1.000' }]);
    });

    it.each([
      ['sem cliente', { customer: undefined }],
      ['sem itens', { items: [] }],
      ['sem prazo', { dueDate: undefined }],
      ['sem CNPJ', { customer: { ...customer(), cnpj: undefined } }],
      ['sem e-mail', { customer: { ...customer(), email: undefined } }],
      [
        'sem tipo de pintura',
        { items: [{ ...item(), paintCatalogItemId: undefined }] },
      ],
    ])('Critério 3: recusa o pedido %s: %j', async (_, overrides) => {
      const res = await requestEstimate({
        customer: customer(),
        items: [item()],
        dueDate: DUE_DATE,
        ...overrides,
      });

      expect(res.status).toBe(400);
    });

    it.each([
      ['área zero', { areaM2: 0 }],
      ['área negativa', { areaM2: -1.5 }],
      ['quantidade zero', { quantity: 0 }],
      ['quantidade negativa', { quantity: -2 }],
    ])('Critério 4: recusa %s: %j', async (_, overrides) => {
      const res = await requestEstimate({
        customer: customer(),
        items: [item(overrides)],
        dueDate: DUE_DATE,
      });

      expect(res.status).toBe(400);
    });

    it('Critério 5 e 6: aceita o projeto em PDF e guarda o arquivo no orçamento', async () => {
      const res = await uploadPdf(PDF, 'projeto.pdf', 'application/pdf');
      const quote = res.body as QuoteResponseDto;
      created.customerIds.push(quote.customerId);

      expect(res.status).toBe(201);
      expect(quote).toMatchObject({
        source: 'pdf',
        status: 'requested',
        minPrice: null,
        maxPrice: null,
      });
      const [order] = await dataSource.query<{ pdf_url: string }[]>(
        'SELECT pdf_url FROM orders WHERE order_id = $1',
        [quote.orderId],
      );
      expect(order.pdf_url).toMatch(/\/quotes\/[0-9a-f-]{36}\.pdf$/);
    });

    it.each([
      ['uma imagem com nome de PDF', PNG, 'projeto.pdf'],
      ['uma imagem', PNG, 'foto.png'],
    ])('Critério 5: recusa %s (%s)', async (_, content, filename) => {
      const res = await uploadPdf(content, filename, 'application/pdf');

      expect(res.status).toBe(400);
    });

    it('Critério 7: liga o orçamento ao cliente que já tem o CNPJ', async () => {
      const cnpj = randomCnpj();
      const first = await requestEstimate({
        customer: customer(cnpj),
        items: [item()],
        dueDate: DUE_DATE,
      });
      const second = await requestEstimate({
        customer: { ...customer(cnpj), name: 'Outro nome' },
        items: [item()],
        dueDate: DUE_DATE,
      });

      expect((second.body as QuoteResponseDto).customerId).toBe(
        (first.body as QuoteResponseDto).customerId,
      );
      const [{ count }] = await dataSource.query<{ count: string }[]>(
        'SELECT count(*) FROM customers WHERE document = $1',
        [cnpj],
      );
      expect(count).toBe('1');
    });

    it('Critério 7: cadastra como cliente PJ um CNPJ novo', async () => {
      const cnpj = randomCnpj();
      const res = await requestEstimate({
        customer: customer(cnpj),
        items: [item()],
        dueDate: DUE_DATE,
      });

      const [newCustomer] = await dataSource.query<Record<string, string>[]>(
        'SELECT type, name, document FROM customers WHERE customer_id = $1',
        [(res.body as QuoteResponseDto).customerId],
      );
      expect(newCustomer).toEqual({
        type: 'business',
        name: 'Metalúrgica Teste Ltda',
        document: cnpj,
      });
    });
  });

  describe('Simulador e catálogo (US08)', () => {
    it('lista no simulador só os itens ativos de cada tipo', async () => {
      const inactiveId = await insertCatalogItem(
        'paintType',
        'Poliéster Antigo',
        30,
        null,
        false,
      );

      const res = await request(app.getHttpServer())
        .get('/quotes/estimator')
        .expect(200);
      const options = res.body as {
        isEnabled: boolean;
        paintTypes: { catalogItemId: string }[];
        partMaterials: { catalogItemId: string }[];
      };

      const paintIds = options.paintTypes.map((paint) => paint.catalogItemId);
      expect(options.isEnabled).toBe(true);
      expect(paintIds).toContain(epoxyId);
      expect(paintIds).not.toContain(inactiveId);
      expect(paintIds).not.toContain(steelId);
      expect(options.partMaterials.map((m) => m.catalogItemId)).toContain(
        steelId,
      );
    });

    it.each([
      ['um tipo de pintura desativado', 'paint'],
      ['um material desativado', 'material'],
    ])('recusa um orçamento com %s (%s)', async (_, disabledItem) => {
      await dataSource.query(
        'UPDATE catalog_items SET is_active = false WHERE catalog_item_id = $1',
        [disabledItem === 'paint' ? epoxyId : steelId],
      );

      const res = await requestEstimate({
        customer: customer(),
        items: [item()],
        dueDate: DUE_DATE,
      });

      expect(res.status).toBe(422);
    });

    it('com o simulador desligado, recusa a estimativa mas aceita o PDF', async () => {
      await setEstimator(false, 15);

      const estimate = await requestEstimate({
        customer: customer(),
        items: [item()],
        dueDate: DUE_DATE,
      });
      const pdf = await uploadPdf(PDF, 'projeto.pdf', 'application/pdf');
      created.customerIds.push((pdf.body as QuoteResponseDto).customerId);

      expect(estimate.status).toBe(403);
      expect((estimate.body as { message: string }).message).toBe(
        ESTIMATOR_DISABLED_MESSAGE,
      );
      expect(pdf.status).toBe(201);
    });
  });
});
