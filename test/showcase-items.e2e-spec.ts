import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { hashPassword } from '../src/auth/password-hash';
import { EmployeeRole } from '../src/employees/entities/employee.entity';
import { IMAGE_CLEANUP_GRACE_PERIOD_MS } from '../src/storage/storage.service';
import {
  ShowcaseItem,
  ShowcaseItemType,
} from '../src/showcase-items/entities/showcase-item.entity';

const PROJECTS_PATH = '/showcase-items/portfolio-projects';
const CATEGORIES_PATH = `${PROJECTS_PATH}/categories`;
const MIN_CATEGORIES = 4;
const MAX_CATEGORIES = 6;
const IMAGES_PATH = '/showcase-items/images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Everything the suite creates carries this prefix, so the cleanup never
// touches rows registered by hand in the development database.
const E2E_PREFIX = 'e2e ';
const CATEGORY = `${E2E_PREFIX}Estrutura Metálica`;
// A name in the format the upload route generates.
const UPLOADED_NAME = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);
const TEXT = Buffer.from('não sou uma imagem');

// The test may run where the public URL does not resolve (inside the backend
// container), so the image is read through the S3 endpoint.
function readableUrl(publicUrl: string): string {
  const bucketUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
  return publicUrl.replace(process.env.S3_PUBLIC_URL ?? '', bucketUrl);
}

describe('Vitrine: projetos do portfólio (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminEmployeeId: string;
  let adminToken: string;

  const api = () => {
    const server = request(app.getHttpServer());
    return {
      get: (url: string) => server.get(url),
      post: (url: string) =>
        server.post(url).set('Authorization', `Bearer ${adminToken}`),
      patch: (url: string) =>
        server.patch(url).set('Authorization', `Bearer ${adminToken}`),
      delete: (url: string) =>
        server.delete(url).set('Authorization', `Bearer ${adminToken}`),
    };
  };

  const uploadImage = async (): Promise<string> => {
    const response = await api()
      .post(IMAGES_PATH)
      .attach('file', PNG, { filename: 'capa.png', contentType: 'image/png' })
      .expect(201);
    return (response.body as { url: string }).url;
  };

  // Each project gets its own picture unless the test passes one.
  const createProject = async (overrides: object = {}) =>
    api()
      .post(PROJECTS_PATH)
      .send({
        title: `${E2E_PREFIX}Portão industrial`,
        description: 'Pintura eletrostática de portão',
        imageUrl: await uploadImage(),
        category: CATEGORY,
        serviceType: 'Pintura epóxi',
        materials: 'Aço',
        ...overrides,
      });

  const createdId = async (overrides: object = {}): Promise<string> => {
    const response = await createProject(overrides);
    expect(response.status).toBe(201);
    return (response.body as { showcaseItemId: string }).showcaseItemId;
  };

  const categoryPath = (category: string) =>
    `${CATEGORIES_PATH}/${encodeURIComponent(category)}`;

  const countCategories = async (): Promise<number> => {
    const [row] = await dataSource.query<{ total: number }[]>(
      `SELECT count(DISTINCT category)::int AS total FROM showcase_items WHERE type = $1`,
      [ShowcaseItemType.PortfolioProject],
    );
    return row.total;
  };

  // The category limits count every project of the database, so the tests
  // bring the total up to what they need with one filler project per
  // category. The fillers skip the API: their picture is not in the bucket.
  const fillCategoriesTo = async (total: number): Promise<void> => {
    for (let index = await countCategories(); index < total; index += 1) {
      await dataSource.getRepository(ShowcaseItem).save({
        type: ShowcaseItemType.PortfolioProject,
        title: `${E2E_PREFIX}Filler ${index}`,
        description: 'Projeto de preenchimento',
        imageUrl: `${process.env.S3_PUBLIC_URL}/showcase/filler.png`,
        category: `${E2E_PREFIX}Filler ${index}`,
        serviceType: 'Pintura epóxi',
        materials: 'Aço',
      });
    }
  };

  const statusOf = async (url: string) =>
    (await fetch(readableUrl(url))).status;

  const cleanUp = () =>
    dataSource.query(
      `DELETE FROM showcase_items WHERE title LIKE '${E2E_PREFIX}%'`,
    );

  beforeAll(async () => {
    // Without the grace period, every change deletes the images the test just
    // uploaded and did not save in a project.
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IMAGE_CLEANUP_GRACE_PERIOD_MS)
      .useValue(0)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const email = `admin-${randomUUID()}@eldo.test`;
    const password = 'AdminPassword@123';
    const rows = await dataSource.query<{ employee_id: string }[]>(
      `INSERT INTO employees (name, email, password_hash, role)
       VALUES ('Admin Vitrine', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(password), EmployeeRole.Admin],
    );
    adminEmployeeId = rows[0].employee_id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    adminToken = (loginRes.body as LoginResponseDto).accessToken;
  });

  beforeEach(cleanUp);

  afterAll(async () => {
    await cleanUp();
    await dataSource.query('DELETE FROM employees WHERE employee_id = $1', [
      adminEmployeeId,
    ]);
    await app.close();
  });

  describe('upload de imagem', () => {
    it('guarda uma imagem PNG e devolve a URL pública', async () => {
      const url = await uploadImage();

      expect(url.startsWith(`${process.env.S3_PUBLIC_URL}/showcase/`)).toBe(
        true,
      );
      expect(url.endsWith('.png')).toBe(true);
      expect(await statusOf(url)).toBe(200);
    });

    it.each([
      ['GIF', GIF, 'capa.gif', 'image/gif'],
      ['texto com extensão de PNG', TEXT, 'capa.png', 'image/png'],
    ])(
      'recusa %s informando os formatos aceitos',
      async (_case, content, filename, contentType) => {
        const response = await api()
          .post(IMAGES_PATH)
          .attach('file', content, { filename, contentType })
          .expect(400);

        expect((response.body as { message: string }).message).toBe(
          'Formatos aceitos: PNG, JPEG e WebP.',
        );
      },
    );

    it.each([
      ['com 1 byte acima de 5 MB', 413, MAX_IMAGE_BYTES + 1],
      ['com exatamente 5 MB', 201, MAX_IMAGE_BYTES],
    ])('responde à imagem %s com %s', async (_case, expectedStatus, size) => {
      const content = Buffer.concat([PNG, Buffer.alloc(size - PNG.length)]);

      await api()
        .post(IMAGES_PATH)
        .attach('file', content, {
          filename: 'grande.png',
          contentType: 'image/png',
        })
        .expect(expectedStatus);
    });

    it('recusa a requisição sem arquivo', async () => {
      await api().post(IMAGES_PATH).expect(400);
    });
  });

  describe('listagem', () => {
    it('pagina a lista e informa hasNextPage', async () => {
      for (const letter of ['A', 'B', 'C']) {
        await createdId({ title: `${E2E_PREFIX}${letter}` });
      }
      const query = { category: CATEGORY, limit: 2 };

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
    ])(
      'filtra pela categoria $category',
      async ({ category, expectedCount }) => {
        const seeds = [
          `${E2E_PREFIX}Estrutura`,
          `${E2E_PREFIX}Estrutura`,
          `${E2E_PREFIX}Portões`,
        ];
        for (const seed of seeds) {
          await createdId({ category: seed });
        }

        const response = await api()
          .get(PROJECTS_PATH)
          .query({ category })
          .expect(200);

        expect((response.body as { items: unknown[] }).items).toHaveLength(
          expectedCount,
        );
      },
    );

    it('lista as categorias em ordem alfabética, sem repetir', async () => {
      for (const name of ['Portões', 'Estrutura', 'Portões']) {
        await createdId({ category: `${E2E_PREFIX}${name}` });
      }

      const response = await api()
        .get(`${PROJECTS_PATH}/categories`)
        .expect(200);

      const mine = (response.body as string[]).filter((category) =>
        category.startsWith(E2E_PREFIX),
      );
      expect(mine).toEqual([`${E2E_PREFIX}Estrutura`, `${E2E_PREFIX}Portões`]);
    });
  });

  describe('CRUD', () => {
    it('percorre o CRUD completo', async () => {
      await fillCategoriesTo(MIN_CATEGORIES);
      const id = await createdId();

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

    it('apaga a capa do bucket ao remover o projeto', async () => {
      await fillCategoriesTo(MIN_CATEGORIES);
      const created = await createProject();
      const { showcaseItemId, imageUrl } = created.body as {
        showcaseItemId: string;
        imageUrl: string;
      };
      expect(await statusOf(imageUrl)).toBe(200);

      await api().delete(`${PROJECTS_PATH}/${showcaseItemId}`).expect(204);

      expect(await statusOf(imageUrl)).toBe(404);
    });

    it('apaga do bucket a capa trocada no PATCH', async () => {
      const created = await createProject();
      const { showcaseItemId, imageUrl: oldUrl } = created.body as {
        showcaseItemId: string;
        imageUrl: string;
      };
      const newUrl = await uploadImage();

      await api()
        .patch(`${PROJECTS_PATH}/${showcaseItemId}`)
        .send({ imageUrl: newUrl })
        .expect(200);

      expect(await statusOf(oldUrl)).toBe(404);
      expect(await statusOf(newUrl)).toBe(200);
    });

    it('apaga um upload que nunca foi salvo em um projeto', async () => {
      const abandonedUrl = await uploadImage();

      await createdId();

      expect(await statusOf(abandonedUrl)).toBe(404);
    });

    it('mantém a imagem usada por outro projeto ao remover um deles', async () => {
      const sharedUrl = await uploadImage();
      const firstId = await createdId({ imageUrl: sharedUrl });
      await createdId({ imageUrl: sharedUrl });

      await api().delete(`${PROJECTS_PATH}/${firstId}`).expect(204);

      expect(await statusOf(sharedUrl)).toBe(200);
    });

    it('remove a foto de antes com null no PATCH', async () => {
      const id = await createdId({ beforeUrl: await uploadImage() });

      const updated = await api()
        .patch(`${PROJECTS_PATH}/${id}`)
        .send({ beforeUrl: null })
        .expect(200);

      expect(
        (updated.body as { beforeUrl: string | null }).beforeUrl,
      ).toBeNull();
    });

    it('trata "Categoria " e "Categoria" como a mesma categoria', async () => {
      const created = await createProject({
        category: `${E2E_PREFIX}Estrutura `,
      });

      expect(created.status).toBe(201);
      expect((created.body as { category: string }).category).toBe(
        `${E2E_PREFIX}Estrutura`,
      );
    });

    it('devolve 404 ao buscar ou apagar um evento pela rota de projeto', async () => {
      const event = await dataSource.getRepository(ShowcaseItem).save({
        type: ShowcaseItemType.CompanyEvent,
        title: `${E2E_PREFIX}Feira`,
        description: 'Feira regional',
        imageUrl: await uploadImage(),
        eventDate: '2026-09-12',
      });

      await api().get(`${PROJECTS_PATH}/${event.showcaseItemId}`).expect(404);
      await api()
        .delete(`${PROJECTS_PATH}/${event.showcaseItemId}`)
        .expect(404);
    });
  });

  describe('limites', () => {
    it('recusa com 409 o quarto projeto de uma categoria', async () => {
      for (let index = 0; index < 3; index += 1) {
        await createdId();
      }

      const response = await createProject();

      expect(response.status).toBe(409);
      expect((response.body as { message: string }).message).toBe(
        `A categoria "${CATEGORY}" já tem o máximo de 3 projetos.`,
      );
    });

    it('recusa com 409 a troca para uma categoria cheia', async () => {
      const full = `${E2E_PREFIX}Cheia`;
      for (let index = 0; index < 3; index += 1) {
        await createdId({ category: full });
      }
      const id = await createdId();

      await api()
        .patch(`${PROJECTS_PATH}/${id}`)
        .send({ category: full })
        .expect(409);
    });

    it('recusa com 409 a sétima categoria', async () => {
      await fillCategoriesTo(MAX_CATEGORIES);

      const response = await createProject({
        category: `${E2E_PREFIX}Sétima`,
      });

      expect(response.status).toBe(409);
      expect((response.body as { message: string }).message).toBe(
        'O portfólio aceita no máximo 6 categorias.',
      );
    });
  });

  describe('categorias', () => {
    it('renomeia a categoria em todos os projetos dela', async () => {
      await fillCategoriesTo(MIN_CATEGORIES);
      const ids = [await createdId(), await createdId()];
      const newName = `${E2E_PREFIX}Portões`;

      const response = await api()
        .patch(categoryPath(CATEGORY))
        .send({ name: `${newName} ` })
        .expect(200);

      expect(response.body as string[]).toContain(newName);
      expect(response.body as string[]).not.toContain(CATEGORY);
      for (const id of ids) {
        const project = await api().get(`${PROJECTS_PATH}/${id}`).expect(200);
        expect((project.body as { category: string }).category).toBe(newName);
      }
    });

    it('recusa com 409 juntar duas categorias acima de 3 projetos', async () => {
      const other = `${E2E_PREFIX}Outra`;
      await createdId();
      await createdId();
      await createdId({ category: other });
      await createdId({ category: other });

      await api()
        .patch(categoryPath(CATEGORY))
        .send({ name: other })
        .expect(409);
    });

    it('remove a categoria com os projetos e as capas', async () => {
      await fillCategoriesTo(MIN_CATEGORIES);
      const created = await createProject();
      const { showcaseItemId, imageUrl } = created.body as {
        showcaseItemId: string;
        imageUrl: string;
      };

      await api().delete(categoryPath(CATEGORY)).expect(204);

      await api().get(`${PROJECTS_PATH}/${showcaseItemId}`).expect(404);
      expect(await statusOf(imageUrl)).toBe(404);
    });

    it.each([
      ['renomear', 'patch' as const],
      ['remover', 'delete' as const],
    ])('devolve 404 ao %s uma categoria inexistente', async (_case, method) => {
      await api()
        [method](categoryPath(`${E2E_PREFIX}Inexistente`))
        .send({ name: `${E2E_PREFIX}Nova` })
        .expect(404);
    });

    it.each([
      ['nome vazio', { name: '   ' }],
      ['nome ausente', {}],
    ])('recusa renomear com %s', async (_case, body) => {
      await createdId();

      await api().patch(categoryPath(CATEGORY)).send(body).expect(400);
    });
  });

  describe('dados inválidos', () => {
    it.each([
      ['capa ausente', { imageUrl: undefined }],
      ['título nulo', { title: null }],
      ['categoria só com espaços', { category: '   ' }],
      ['campo desconhecido', { unexpected: true }],
      ['capa de outro site', { imageUrl: 'https://exemplo.com/capa.jpg' }],
      [
        'capa de outra pasta do bucket',
        {
          imageUrl: `${process.env.S3_PUBLIC_URL}/visual/${UPLOADED_NAME}.png`,
        },
      ],
      [
        'capa com nome que o upload não gera',
        { imageUrl: `${process.env.S3_PUBLIC_URL}/showcase/capa.png` },
      ],
      [
        'capa com parâmetros na URL',
        {
          imageUrl: `${process.env.S3_PUBLIC_URL}/showcase/${UPLOADED_NAME}.png?v=2`,
        },
      ],
      [
        'capa que sai da pasta com ..',
        {
          imageUrl: `${process.env.S3_PUBLIC_URL}/showcase/../visual/${UPLOADED_NAME}.png`,
        },
      ],
    ])('recusa %s no POST com 400', async (_case, overrides) => {
      const response = await createProject(overrides);

      expect(response.status).toBe(400);
    });

    it.each([
      ['título nulo', { title: null }],
      ['categoria nula', { category: null }],
      ['capa nula', { imageUrl: null }],
      ['título numérico', { title: 123 }],
    ])('recusa %s no PATCH com 400', async (_case, body) => {
      const id = await createdId();

      await api().patch(`${PROJECTS_PATH}/${id}`).send(body).expect(400);
    });

    it.each([
      ['page zero', { page: 0 }],
      ['limit acima do máximo', { limit: 51 }],
    ])('recusa a listagem com %s', async (_case, query) => {
      await api().get(PROJECTS_PATH).query(query).expect(400);
    });

    it('devolve 400 para um id que não é UUID', async () => {
      await api().get(`${PROJECTS_PATH}/abc`).expect(400);
    });
  });
});
