import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Workbook } from 'exceljs';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { StatisticsResponseDto } from '../src/statistics/dto/statistics-response.dto';

// The dashboard counts every order in the database, so the tests use a period
// far in the future that no other test or development data reaches.
const TEST_PERIOD = { startDate: '2041-03-01', endDate: '2041-03-31' };
const INSIDE_PERIOD = '2041-03-15T12:00:00.000Z';
const AFTER_PERIOD = '2041-04-02T12:00:00.000Z';

describe('Análises estatísticas (e2e) - US11 e US12', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  // Every sale needs a seller (CHK_orders_sale); one is enough for the tests.
  let sellerEmployeeId: string;

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

    sellerEmployeeId = randomUUID();
    await dataSource.query(
      `INSERT INTO employees (employee_id, name, email, password_hash, role)
       VALUES ($1, 'Vendedor Teste', $2, 'hash', 'employee')`,
      [sellerEmployeeId, `seller-${sellerEmployeeId.slice(0, 8)}@eldo.com.br`],
    );
  });

  afterEach(async () => {
    // Order items go with their orders (ON DELETE CASCADE).
    await dataSource.query(`DELETE FROM orders WHERE order_id = ANY($1)`, [
      created.orderIds,
    ]);
    await dataSource.query(
      `DELETE FROM customers WHERE customer_id = ANY($1)`,
      [created.customerIds],
    );
    await dataSource.query(
      `DELETE FROM catalog_items WHERE catalog_item_id = ANY($1)`,
      [created.catalogItemIds],
    );
    created.orderIds = [];
    created.customerIds = [];
    created.catalogItemIds = [];
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM employees WHERE employee_id = $1`, [
      sellerEmployeeId,
    ]);
    await app.close();
  });

  function getStatistics(period = TEST_PERIOD) {
    return request(app.getHttpServer()).get('/statistics').query(period);
  }

  function randomDocument(): string {
    return String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
  }

  async function insertCustomer(): Promise<string> {
    const customerId = randomUUID();
    await dataSource.query(
      `INSERT INTO customers (customer_id, type, name, document, email, phone)
       VALUES ($1, 'business', 'ACME Test', $2, $3, '61999999999')`,
      [customerId, randomDocument(), `acme-${customerId.slice(0, 8)}@test.com`],
    );
    created.customerIds.push(customerId);
    return customerId;
  }

  async function insertCatalogItem(
    type: 'paintType' | 'partMaterial',
    name: string,
  ): Promise<string> {
    const [{ catalog_item_id: catalogItemId }] = await dataSource.query<
      { catalog_item_id: string }[]
    >(
      `INSERT INTO catalog_items (type, name, price_per_m2, price_factor)
       VALUES ($1, $2, $3, $4) RETURNING catalog_item_id`,
      [
        type,
        name,
        type === 'paintType' ? 50 : null,
        type === 'partMaterial' ? 1 : null,
      ],
    );
    created.catalogItemIds.push(catalogItemId);
    return catalogItemId;
  }

  async function insertQuote(source: string, createdAt: string) {
    const orderId = randomUUID();
    await dataSource.query(
      `INSERT INTO orders (order_id, customer_id, source, status, created_at)
       VALUES ($1, $2, $3, 'requested', $4)`,
      [orderId, await insertCustomer(), source, createdAt],
    );
    created.orderIds.push(orderId);
    return orderId;
  }

  async function insertSoldQuote(source: string, createdAt: string) {
    const orderId = randomUUID();
    await dataSource.query(
      `INSERT INTO orders (
         order_id, customer_id, seller_employee_id, source, status, created_at,
         final_price, commission, sold_at, tracking_code, scope, due_date
       ) VALUES ($1, $2, $6, $3, 'queued', $4, 1000, 0, $4, $5, 'Escopo', '2041-05-01')`,
      [
        orderId,
        await insertCustomer(),
        source,
        createdAt,
        `T${randomInt(1000000, 9999999)}`,
        sellerEmployeeId,
      ],
    );
    created.orderIds.push(orderId);
    return orderId;
  }

  async function insertOrderItem(
    orderId: string,
    paintCatalogItemId: string,
    materialCatalogItemId: string,
  ) {
    await dataSource.query(
      `INSERT INTO order_items (
         order_id, material_catalog_item_id, paint_catalog_item_id,
         area_m2, quantity, price_per_m2, price_factor
       ) VALUES ($1, $2, $3, 1, 1, 50, 1)`,
      [orderId, materialCatalogItemId, paintCatalogItemId],
    );
  }

  describe('Critérios de Aceite da US11', () => {
    it('Critério 1: mostra volume de orçamentos, taxa de conversão e serviços mais pedidos', async () => {
      const epoxyId = await insertCatalogItem('paintType', 'Epóxi Teste');
      const polyesterId = await insertCatalogItem(
        'paintType',
        'Poliéster Teste',
      );
      const steelId = await insertCatalogItem('partMaterial', 'Aço Teste');

      const pdfQuoteId = await insertQuote('pdf', INSIDE_PERIOD);
      const estimatorQuoteId = await insertQuote('estimator', INSIDE_PERIOD);
      const soldQuoteId = await insertSoldQuote('pdf', INSIDE_PERIOD);
      await insertQuote('estimator', INSIDE_PERIOD);
      // Contact requests and internal orders are not quotes.
      await insertQuote('contact', INSIDE_PERIOD);
      const internalSaleId = await insertSoldQuote('internal', INSIDE_PERIOD);

      // Two pieces of epoxy in the same order count as one order.
      await insertOrderItem(pdfQuoteId, epoxyId, steelId);
      await insertOrderItem(pdfQuoteId, epoxyId, steelId);
      await insertOrderItem(soldQuoteId, epoxyId, steelId);
      await insertOrderItem(estimatorQuoteId, polyesterId, steelId);
      // The ranking counts every order, so the internal sale counts there.
      await insertOrderItem(internalSaleId, epoxyId, steelId);

      const res = await getStatistics().expect(200);

      expect(res.body).toEqual({
        ...TEST_PERIOD,
        hasData: true,
        quoteCount: 4,
        convertedQuoteCount: 1,
        conversionRate: 0.25,
        topPaintTypes: [
          { catalogItemId: epoxyId, name: 'Epóxi Teste', orderCount: 3 },
          {
            catalogItemId: polyesterId,
            name: 'Poliéster Teste',
            orderCount: 1,
          },
        ],
      });
    });

    it.each([
      ['desativado', 'is_active = false', 1],
      ['excluído', 'deleted_at = NOW()', 1],
    ])(
      'Critério 1: um tipo de pintura %s (%s) continua no ranking com %i pedido',
      async (_, removal, expectedOrderCount) => {
        const epoxyId = await insertCatalogItem('paintType', 'Epóxi Antigo');
        const steelId = await insertCatalogItem('partMaterial', 'Aço Teste');
        const orderId = await insertQuote('pdf', INSIDE_PERIOD);
        await insertOrderItem(orderId, epoxyId, steelId);
        await dataSource.query(
          `UPDATE catalog_items SET ${removal} WHERE catalog_item_id = $1`,
          [epoxyId],
        );

        const res = await getStatistics().expect(200);

        expect((res.body as StatisticsResponseDto).topPaintTypes).toEqual([
          {
            catalogItemId: epoxyId,
            name: 'Epóxi Antigo',
            orderCount: expectedOrderCount,
          },
        ]);
      },
    );

    // Brasília is UTC-3: 23h of a day in Brasília is 02h of the next day in
    // UTC, so a UTC period would put these quotes in the wrong month.
    it.each([
      ['2041-04-01T02:00:00.000Z', 1],
      ['2041-03-01T02:00:00.000Z', 0],
    ])(
      'Critério 2: um orçamento criado em %s conta %i vez em março, no fuso de Brasília',
      async (createdAt, expectedQuoteCount) => {
        await insertQuote('pdf', createdAt);

        const res = await getStatistics().expect(200);

        expect((res.body as StatisticsResponseDto).quoteCount).toBe(
          expectedQuoteCount,
        );
      },
    );

    it.each([
      [
        { startDate: '2041-03-01', endDate: '2041-03-31' },
        { quoteCount: 1, hasData: true },
      ],
      [
        { startDate: '2041-04-01', endDate: '2041-04-30' },
        { quoteCount: 1, hasData: true },
      ],
      [
        { startDate: '2041-01-01', endDate: '2041-04-30' },
        { quoteCount: 2, hasData: true },
      ],
    ])(
      'Critério 2: recalcula os indicadores para o período %j',
      async (period, expected) => {
        await insertQuote('pdf', INSIDE_PERIOD);
        await insertQuote('pdf', AFTER_PERIOD);

        const res = await getStatistics(period).expect(200);

        expect(res.body).toMatchObject({ ...period, ...expected });
      },
    );

    it('Critério 3: devolve um estado vazio claro quando o período não tem dados', async () => {
      const res = await getStatistics().expect(200);

      expect(res.body).toEqual({
        ...TEST_PERIOD,
        hasData: false,
        quoteCount: 0,
        convertedQuoteCount: 0,
        conversionRate: null,
        topPaintTypes: [],
      });
    });
  });

  describe('Validações de entrada', () => {
    it.each([
      ['sem datas', {}],
      ['formato inválido', { startDate: '01/03/2041', endDate: '2041-03-31' }],
      ['data inexistente', { startDate: '2041-02-30', endDate: '2041-03-31' }],
    ])('rejeita o período %s: %j', async (_, period) => {
      await request(app.getHttpServer())
        .get('/statistics')
        .query(period)
        .expect(400);
    });

    it.each([
      ['2041-03-31', '2041-03-01'],
      ['2041-12-15', '2041-12-10'],
    ])('rejeita o período invertido de %s a %s', async (startDate, endDate) => {
      const res = await getStatistics({ startDate, endDate }).expect(400);

      expect((res.body as { message: string }).message).toBe(
        'A data inicial não pode ser posterior à data final.',
      );
    });
  });

  describe('Exportação de relatórios (US12)', () => {
    // 'blob' makes supertest keep the file bytes in res.body as a Buffer.
    function exportStatistics(format: string, period = TEST_PERIOD) {
      return request(app.getHttpServer())
        .get('/statistics/export')
        .query({ ...period, format })
        .responseType('blob');
    }

    async function insertQuoteWithPaintType() {
      const epoxyId = await insertCatalogItem('paintType', 'Epóxi Teste');
      const steelId = await insertCatalogItem('partMaterial', 'Aço Teste');
      const orderId = await insertSoldQuote('pdf', INSIDE_PERIOD);
      await insertQuote('estimator', INSIDE_PERIOD);
      await insertOrderItem(orderId, epoxyId, steelId);
    }

    it('Critério 1: gera e baixa um PDF com os dados do período', async () => {
      await insertQuoteWithPaintType();

      const res = await exportStatistics('pdf').expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="relatorio-estatisticas-2041-03-01-a-2041-03-31.pdf"',
      );
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('Critério 2: gera e baixa uma planilha XLSX com os dados do período', async () => {
      await insertQuoteWithPaintType();

      const res = await exportStatistics('xlsx').expect(200);

      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="relatorio-estatisticas-2041-03-01-a-2041-03-31.xlsx"',
      );
      const workbook = new Workbook();
      // exceljs types load() with its own Buffer, which is an ArrayBuffer.
      await workbook.xlsx.load(new Uint8Array(res.body as Buffer).buffer);
      const indicators = workbook.getWorksheet('Indicadores');
      const paintTypes = workbook.getWorksheet('Tipos de pintura');
      expect(indicators?.getCell('B4').value).toBe(2);
      expect(indicators?.getCell('B6').value).toBe(0.5);
      expect(indicators?.getCell('B6').numFmt).toBe('0.00%');
      expect(paintTypes?.getCell('B2').value).toBe('Epóxi Teste');
    });

    it.each([
      ['pdf', 'PDF'],
      ['xlsx', 'planilha'],
    ])(
      'Critério 3: avisa que não há dados ao exportar %s (%s) de um período vazio',
      async (format) => {
        const res = await request(app.getHttpServer())
          .get('/statistics/export')
          .query({ ...TEST_PERIOD, format })
          .expect(422);

        expect((res.body as { message: string }).message).toBe(
          'Não há dados para exportar no período.',
        );
      },
    );

    it.each([
      ['sem formato', { ...TEST_PERIOD }],
      ['formato csv', { ...TEST_PERIOD, format: 'csv' }],
      ['sem datas', { format: 'pdf' }],
    ])('rejeita a exportação %s: %j', async (_, query) => {
      await request(app.getHttpServer())
        .get('/statistics/export')
        .query(query)
        .expect(400);
    });
  });
});
