import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  ShowcaseItem,
  ShowcaseItemType,
} from '../src/showcase-items/entities/showcase-item.entity';

const PROJECTS_PATH = '/showcase-items/portfolio-projects';
const EVENTS_PATH = '/showcase-items/company-events';
const IMAGES_PATH = '/showcase-items/images';
// Everything the suite creates carries this prefix, so the cleanup never
// touches rows registered by hand in the development database.
const E2E_PREFIX = 'e2e ';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

describe('Vitrine: projetos do portfólio (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let imageUrl: string;

  const api = () => request(app.getHttpServer());

  const validProject = (overrides: object = {}) => ({
    title: `${E2E_PREFIX}Portão industrial`,
    description: 'Pintura eletrostática de portão',
    imageUrl,
    category: `${E2E_PREFIX}Estrutura Metálica`,
    serviceType: 'Pintura epóxi',
    materials: 'Aço',
    ...overrides,
  });

  const createProject = (overrides: object = {}) =>
    api().post(PROJECTS_PATH).send(validProject(overrides));

  const cleanUp = () =>
    dataSource.query(
      `DELETE FROM showcase_items WHERE title LIKE '${E2E_PREFIX}%'`,
    );

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const upload = await api()
      .post(IMAGES_PATH)
      .attach('file', PNG, { filename: 'capa.png', contentType: 'image/png' })
      .expect(201);
    imageUrl = (upload.body as { url: string }).url;
  });

  beforeEach(cleanUp);
  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('pagina a lista e informa hasNextPage', async () => {
    for (const letter of ['A', 'B', 'C']) {
      await createProject({ title: `${E2E_PREFIX}${letter}` }).expect(201);
    }
    const query = { category: `${E2E_PREFIX}Estrutura Metálica`, limit: 2 };

    const first = await api()
      .get(PROJECTS_PATH)
      .query({ ...query, page: 1 })
      .expect(200);
    expect(first.body).toMatchObject({ total: 3, hasNextPage: true });
    expect((first.body as { items: unknown[] }).items).toHaveLength(2);

    const second = await api()
      .get(PROJECTS_PATH)
      .query({ ...query, page: 2 })
      .expect(200);
    expect(second.body).toMatchObject({ hasNextPage: false });
    expect((second.body as { items: unknown[] }).items).toHaveLength(1);
  });

  it.each([
    { category: `${E2E_PREFIX}Estrutura`, expectedCount: 2 },
    { category: `${E2E_PREFIX}Portões`, expectedCount: 1 },
  ])('filtra pela categoria $category', async ({ category, expectedCount }) => {
    for (const seed of [
      `${E2E_PREFIX}Estrutura`,
      `${E2E_PREFIX}Estrutura`,
      `${E2E_PREFIX}Portões`,
    ]) {
      await createProject({ category: seed }).expect(201);
    }
    const response = await api()
      .get(PROJECTS_PATH)
      .query({ category })
      .expect(200);
    expect((response.body as { items: unknown[] }).items).toHaveLength(
      expectedCount,
    );
  });

  it('lista as categorias em ordem alfabética, sem repetir', async () => {
    for (const name of ['Portões', 'Estrutura', 'Portões']) {
      await createProject({ category: `${E2E_PREFIX}${name}` }).expect(201);
    }
    const response = await api().get(`${PROJECTS_PATH}/categories`).expect(200);
    const mine = (response.body as string[]).filter((c) =>
      c.startsWith(E2E_PREFIX),
    );
    expect(mine).toEqual([`${E2E_PREFIX}Estrutura`, `${E2E_PREFIX}Portões`]);
  });

  it('percorre o CRUD completo', async () => {
    const created = await createProject().expect(201);
    const id = (created.body as { showcaseItemId: string }).showcaseItemId;

    await api().get(`${PROJECTS_PATH}/${id}`).expect(200);
    const updated = await api()
      .patch(`${PROJECTS_PATH}/${id}`)
      .send({ title: `${E2E_PREFIX}Portão pintado` })
      .expect(200);
    expect((updated.body as { title: string }).title).toBe(
      `${E2E_PREFIX}Portão pintado`,
    );
    await api().delete(`${PROJECTS_PATH}/${id}`).expect(204);
    await api().get(`${PROJECTS_PATH}/${id}`).expect(404);
  });

  it('devolve 404 ao buscar ou apagar um evento pela rota de projeto', async () => {
    const event = await dataSource.getRepository(ShowcaseItem).save({
      type: ShowcaseItemType.CompanyEvent,
      title: `${E2E_PREFIX}Feira`,
      description: 'Feira regional',
      imageUrl,
      eventDate: '2026-09-12',
    });
    await api().get(`${PROJECTS_PATH}/${event.showcaseItemId}`).expect(404);
    await api().delete(`${PROJECTS_PATH}/${event.showcaseItemId}`).expect(404);
    await api().get(`${EVENTS_PATH}/${event.showcaseItemId}`).expect(200);
  });

  it.each([
    ['capa ausente', { imageUrl: undefined }],
    ['título nulo', { title: null }],
    ['categoria só com espaços', { category: '   ' }],
    ['campo desconhecido', { unexpected: true }],
    ['capa de outro site', { imageUrl: 'https://exemplo.com/capa.jpg' }],
  ])('recusa %s no POST com 400', async (_case, overrides) => {
    await createProject(overrides).expect(400);
  });

  it.each([
    ['título nulo', { title: null }],
    ['categoria nula', { category: null }],
    ['capa nula', { imageUrl: null }],
  ])('recusa %s no PATCH com 400', async (_case, body) => {
    const created = await createProject().expect(201);
    const id = (created.body as { showcaseItemId: string }).showcaseItemId;
    await api().patch(`${PROJECTS_PATH}/${id}`).send(body).expect(400);
  });

  it('remove a foto de antes com null no PATCH', async () => {
    const created = await createProject({ beforeUrl: imageUrl }).expect(201);
    const id = (created.body as { showcaseItemId: string }).showcaseItemId;
    const updated = await api()
      .patch(`${PROJECTS_PATH}/${id}`)
      .send({ beforeUrl: null })
      .expect(200);
    expect((updated.body as { beforeUrl: string | null }).beforeUrl).toBeNull();
  });

  it('trata "Categoria " e "Categoria" como a mesma categoria', async () => {
    const created = await createProject({
      category: `${E2E_PREFIX}Estrutura `,
    }).expect(201);
    expect((created.body as { category: string }).category).toBe(
      `${E2E_PREFIX}Estrutura`,
    );
  });
});
