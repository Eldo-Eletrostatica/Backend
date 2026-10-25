import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { CatalogItemResponseDto } from '../src/catalog-items/dto/catalog-item-response.dto';
import { EmployeeRole } from '../src/employees/entities/employee.entity';
import { QuoteResponseDto } from '../src/quotes/dto/quote-response.dto';
import { EstimatorSettingsDto } from '../src/site-settings/dto/estimator-settings.dto';

const PASSWORD = 'Password@123';

interface EstimatorSettingsRow {
  is_estimator_enabled: boolean;
  negotiation_margin: string;
}

describe('Regras de cálculo de orçamento (e2e) - US08', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let employeeToken: string;
  let developmentSettings: EstimatorSettingsRow;

  const created = {
    employeeIds: [] as string[],
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

    adminToken = await loginAs(EmployeeRole.Admin);
    employeeToken = await loginAs(EmployeeRole.Employee);
    // site_settings has a single row shared with the development database.
    [developmentSettings] = await dataSource.query<EstimatorSettingsRow[]>(
      'SELECT is_estimator_enabled, negotiation_margin FROM site_settings',
    );
  });

  beforeEach(async () => {
    await dataSource.query(
      'UPDATE site_settings SET is_estimator_enabled = true, negotiation_margin = 10',
    );
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
    created.customerIds.length = 0;
    created.catalogItemIds.length = 0;
  });

  afterAll(async () => {
    await dataSource.query(
      'UPDATE site_settings SET is_estimator_enabled = $1, negotiation_margin = $2',
      [
        developmentSettings.is_estimator_enabled,
        developmentSettings.negotiation_margin,
      ],
    );
    await dataSource.query(
      'DELETE FROM employees WHERE employee_id = ANY($1)',
      [created.employeeIds],
    );
    await app.close();
  });

  async function loginAs(role: EmployeeRole): Promise<string> {
    const email = `${role}-${randomUUID()}@eldo.test`;
    const [{ employee_id: employeeId }] = await dataSource.query<
      { employee_id: string }[]
    >(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Funcionário Teste', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(PASSWORD), role],
    );
    created.employeeIds.push(employeeId);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return (res.body as LoginResponseDto).accessToken;
  }

  const asAdmin = () => {
    const server = request(app.getHttpServer());
    const auth = `Bearer ${adminToken}`;
    return {
      get: (url: string) => server.get(url).set('Authorization', auth),
      post: (url: string) => server.post(url).set('Authorization', auth),
      patch: (url: string) => server.patch(url).set('Authorization', auth),
      delete: (url: string) => server.delete(url).set('Authorization', auth),
    };
  };

  async function createCatalogItem(
    body: Record<string, unknown>,
  ): Promise<CatalogItemResponseDto> {
    const res = await asAdmin()
      .post('/catalog-items')
      .send({ name: `Item ${randomUUID().slice(0, 8)}`, ...body })
      .expect(201);
    const catalogItem = res.body as CatalogItemResponseDto;
    created.catalogItemIds.push(catalogItem.catalogItemId);
    return catalogItem;
  }

  const createPaint = (pricePerM2 = 50) =>
    createCatalogItem({ type: 'paintType', pricePerM2 });
  const createMaterial = (priceFactor = 1) =>
    createCatalogItem({ type: 'partMaterial', priceFactor });

  async function requestEstimate(paintId: string, materialId: string) {
    const cnpj = String(randomInt(0, 99_999_999)).padStart(8, '0') + '000199';
    const res = await request(app.getHttpServer())
      .post('/quotes/estimator')
      .send({
        customer: {
          name: 'Cliente Teste',
          cnpj,
          email: `c-${cnpj}@teste.com`,
          phone: '61999999999',
        },
        items: [
          {
            paintCatalogItemId: paintId,
            materialCatalogItemId: materialId,
            areaM2: 1,
            quantity: 1,
          },
        ],
        dueDate: '2030-01-15',
      });
    if (res.status === 201) {
      created.customerIds.push((res.body as QuoteResponseDto).customerId);
    }
    return res;
  }

  async function getEstimatorOptions() {
    const res = await request(app.getHttpServer())
      .get('/quotes/estimator')
      .expect(200);
    return res.body as {
      isEnabled: boolean;
      paintTypes: { catalogItemId: string }[];
    };
  }

  describe('Critérios de Aceite da US08', () => {
    it('Critério 1: o administrador vê os preços, os fatores e a margem', async () => {
      const paint = await createPaint(45.5);
      const material = await createMaterial(1.2);

      const items = await asAdmin().get('/catalog-items').expect(200);
      const settings = await asAdmin()
        .get('/site-settings/estimator')
        .expect(200);

      expect(items.body).toEqual(expect.arrayContaining([paint, material]));
      expect(paint).toMatchObject({ pricePerM2: 45.5, priceFactor: null });
      expect(material).toMatchObject({ pricePerM2: null, priceFactor: 1.2 });
      expect(settings.body).toEqual({ isEnabled: true, negotiationMargin: 10 });
    });

    // The old quote was made at R$ 50/m² and a 10% margin: R$ 50 to R$ 55.
    it.each([
      ['o preço por m²', 'pricePerM2', 80, { minPrice: 80, maxPrice: 88 }],
      ['a margem', 'negotiationMargin', 20, { minPrice: 50, maxPrice: 60 }],
    ])(
      'Critério 2: ao mudar %s (%s) para %p, o orçamento novo sai com %j e o antigo mantém o da época',
      async (_, field, newValue, expectedNewRange) => {
        const paint = await createPaint(50);
        const material = await createMaterial(1);
        const oldQuote = await requestEstimate(
          paint.catalogItemId,
          material.catalogItemId,
        );

        if (field === 'pricePerM2') {
          await asAdmin()
            .patch(`/catalog-items/${paint.catalogItemId}`)
            .send({ pricePerM2: newValue })
            .expect(200);
        } else {
          await asAdmin()
            .patch('/site-settings/estimator')
            .send({ negotiationMargin: newValue })
            .expect(200);
        }
        const newQuote = await requestEstimate(
          paint.catalogItemId,
          material.catalogItemId,
        );

        const oldOrderId = (oldQuote.body as QuoteResponseDto).orderId;
        const [oldOrder] = await dataSource.query<
          { min_price: string; max_price: string }[]
        >('SELECT min_price, max_price FROM orders WHERE order_id = $1', [
          oldOrderId,
        ]);
        expect({
          minPrice: Number(oldOrder.min_price),
          maxPrice: Number(oldOrder.max_price),
        }).toEqual({ minPrice: 50, maxPrice: 55 });
        expect(newQuote.body).toMatchObject(expectedNewRange);
      },
    );

    it('Critério 3: um tipo de pintura desativado some do simulador', async () => {
      const paint = await createPaint();

      await asAdmin()
        .patch(`/catalog-items/${paint.catalogItemId}`)
        .send({ isActive: false })
        .expect(200);

      const options = await getEstimatorOptions();
      expect(options.paintTypes.map((p) => p.catalogItemId)).not.toContain(
        paint.catalogItemId,
      );
    });

    it.each([
      [false, false],
      [true, true],
    ])(
      'Critério 4: com o simulador ligado = %s, a tela pública recebe isEnabled = %s',
      async (isEnabled, expectedIsEnabled) => {
        await asAdmin()
          .patch('/site-settings/estimator')
          .send({ isEnabled })
          .expect(200);

        expect((await getEstimatorOptions()).isEnabled).toBe(expectedIsEnabled);
      },
    );

    it('Critério 5: com o simulador desligado, a tela pública não recebe opções', async () => {
      await createPaint();
      await asAdmin()
        .patch('/site-settings/estimator')
        .send({ isEnabled: false })
        .expect(200);

      expect(await getEstimatorOptions()).toEqual({
        isEnabled: false,
        paintTypes: [],
        partMaterials: [],
      });
    });

    it.each([
      ['negativo', -10],
      ['zero', 0],
      ['não numérico', 'abc'],
    ])(
      'Critério 6: recusa um preço por m² %s (%p) e mantém o anterior',
      async (_, invalidPrice) => {
        const paint = await createPaint(50);

        await asAdmin()
          .patch(`/catalog-items/${paint.catalogItemId}`)
          .send({ pricePerM2: invalidPrice })
          .expect(400);

        const items = await asAdmin().get('/catalog-items').expect(200);
        expect(items.body).toContainEqual(paint);
      },
    );

    it.each([
      ['negativa', -1],
      ['acima de 100', 101],
      ['não numérica', 'dez'],
    ])(
      'Critério 6: recusa uma margem %s (%p) e mantém a anterior',
      async (_, invalidMargin) => {
        await asAdmin()
          .patch('/site-settings/estimator')
          .send({ negotiationMargin: invalidMargin })
          .expect(400);

        const settings = await asAdmin()
          .get('/site-settings/estimator')
          .expect(200);
        expect((settings.body as EstimatorSettingsDto).negotiationMargin).toBe(
          10,
        );
      },
    );
  });

  describe('Catálogo de preços', () => {
    it.each([
      ['tipo de pintura sem preço por m²', { type: 'paintType' }],
      [
        'tipo de pintura com fator',
        { type: 'paintType', pricePerM2: 50, priceFactor: 1.2 },
      ],
      ['material sem fator', { type: 'partMaterial' }],
      [
        'material com preço por m²',
        { type: 'partMaterial', priceFactor: 1, pricePerM2: 50 },
      ],
      ['tipo desconhecido', { type: 'tinta', pricePerM2: 50 }],
    ])('recusa cadastrar %s: %j', async (_, body) => {
      await asAdmin()
        .post('/catalog-items')
        .send({ name: 'Item Inválido', ...body })
        .expect(400);
    });

    it('não deixa um tipo de pintura receber fator na alteração', async () => {
      const paint = await createPaint();

      await asAdmin()
        .patch(`/catalog-items/${paint.catalogItemId}`)
        .send({ priceFactor: 1.2 })
        .expect(400);
    });

    it('exclui o item, que some da lista mas continua no banco (ADR 0002)', async () => {
      const paint = await createPaint();

      await asAdmin()
        .delete(`/catalog-items/${paint.catalogItemId}`)
        .expect(204);

      const items = await asAdmin().get('/catalog-items').expect(200);
      const [row] = await dataSource.query<{ deleted_at: Date | null }[]>(
        'SELECT deleted_at FROM catalog_items WHERE catalog_item_id = $1',
        [paint.catalogItemId],
      );
      expect(items.body).not.toContainEqual(paint);
      expect(row.deleted_at).not.toBeNull();
    });

    it.each([
      ['PATCH', 'patch'],
      ['DELETE', 'delete'],
    ])('responde 404 num %s de item inexistente (%s)', async (_, method) => {
      const url = `/catalog-items/${randomUUID()}`;
      const call =
        method === 'patch'
          ? asAdmin().patch(url).send({ name: 'Outro' })
          : asAdmin().delete(url);

      await call.expect(404);
    });
  });

  describe('Acesso restrito a administradores', () => {
    it.each([
      ['GET', '/catalog-items'],
      ['GET', '/site-settings/estimator'],
      ['PATCH', '/site-settings/estimator'],
    ])('%s %s responde 401 sem login', async (method, url) => {
      const server = request(app.getHttpServer());
      const call = method === 'GET' ? server.get(url) : server.patch(url);

      await call.expect(401);
    });

    it.each([
      ['GET', '/catalog-items'],
      ['PATCH', '/site-settings/estimator'],
    ])(
      '%s %s responde 403 para um funcionário que não é administrador',
      async (method, url) => {
        const server = request(app.getHttpServer());
        const call = method === 'GET' ? server.get(url) : server.patch(url);

        await call.set('Authorization', `Bearer ${employeeToken}`).expect(403);
      },
    );
  });
});
