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

const EVENTS_PATH = '/showcase-items/company-events';
const IMAGES_PATH = '/showcase-items/images';
const MIN_EVENTS = 3;
const MAX_EVENTS = 10;
// The minimum is covered by the unit tests: reaching exactly three events here
// would mean deleting the events of the development database.
// Everything the suite creates carries this prefix, so the cleanup never
// touches rows registered by hand in the development database.
const E2E_PREFIX = 'e2e ';
// A name in the format the upload route generates.
const UPLOADED_NAME = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

// The test may run where the public URL does not resolve (inside the backend
// container), so the image is read through the S3 endpoint.
function readableUrl(publicUrl: string): string {
  const bucketUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
  return publicUrl.replace(process.env.S3_PUBLIC_URL ?? '', bucketUrl);
}

describe('Vitrine: eventos (e2e)', () => {
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
      .attach('file', PNG, { filename: 'evento.png', contentType: 'image/png' })
      .expect(201);
    return (response.body as { url: string }).url;
  };

  // Each event gets its own picture: removing an event deletes it.
  const createEvent = async (overrides: object = {}) =>
    api()
      .post(EVENTS_PATH)
      .send({
        title: `${E2E_PREFIX}Feira Industrial`,
        description: 'Participação na feira regional',
        imageUrl: await uploadImage(),
        eventDate: '2026-09-12',
        ...overrides,
      });

  const createdId = async (overrides: object = {}): Promise<string> => {
    const response = await createEvent(overrides);
    expect(response.status).toBe(201);
    return (response.body as { showcaseItemId: string }).showcaseItemId;
  };

  const countEvents = async (): Promise<number> => {
    const [row] = await dataSource.query<{ total: number }[]>(
      `SELECT count(*)::int AS total FROM showcase_items WHERE type = '${ShowcaseItemType.CompanyEvent}'`,
    );
    return row.total;
  };

  // The limits count every event of the database, so the tests bring the
  // total up to what they need with filler events.
  const fillEventsTo = async (total: number): Promise<void> => {
    let current = await countEvents();
    while (current < total) {
      await createdId({ title: `${E2E_PREFIX}Filler ${current}` });
      current += 1;
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
    // uploaded and did not save in an event.
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
       VALUES ('Admin Eventos', $1, $2, $3) RETURNING employee_id`,
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

  describe('listagem', () => {
    it.each([
      [
        'pela data do evento, para a linha do tempo do site',
        {},
        [`${E2E_PREFIX}Junho`, `${E2E_PREFIX}Janeiro`],
      ],
      [
        'pela data de criação, para o painel',
        { orderBy: 'createdAt' },
        [`${E2E_PREFIX}Janeiro`, `${E2E_PREFIX}Junho`],
      ],
    ])('lista os eventos %s', async (_case, query, expectedTitles) => {
      await createdId({ title: `${E2E_PREFIX}Junho`, eventDate: '2026-06-20' });
      await createdId({
        title: `${E2E_PREFIX}Janeiro`,
        eventDate: '2026-01-10',
      });

      const response = await api().get(EVENTS_PATH).query(query).expect(200);

      const mine = (response.body as { title: string }[])
        .map((event) => event.title)
        .filter((title) => title.startsWith(E2E_PREFIX));
      expect(mine).toEqual(expectedTitles);
    });

    it('recusa uma ordenação desconhecida', async () => {
      await api().get(EVENTS_PATH).query({ orderBy: 'title' }).expect(400);
    });
  });

  describe('CRUD', () => {
    it('percorre o CRUD completo', async () => {
      await fillEventsTo(MIN_EVENTS + 1);
      const id = await createdId();

      const found = await api().get(`${EVENTS_PATH}/${id}`).expect(200);
      expect((found.body as { eventDate: string }).eventDate).toBe(
        '2026-09-12',
      );
      const updated = await api()
        .patch(`${EVENTS_PATH}/${id}`)
        .send({ title: `${E2E_PREFIX}Feira pintada`, eventDate: '2026-10-01' })
        .expect(200);
      expect(updated.body).toMatchObject({
        title: `${E2E_PREFIX}Feira pintada`,
        eventDate: '2026-10-01',
      });
      await api().delete(`${EVENTS_PATH}/${id}`).expect(204);
      await api().get(`${EVENTS_PATH}/${id}`).expect(404);
    });

    it('apaga a imagem do bucket ao remover o evento', async () => {
      await fillEventsTo(MIN_EVENTS + 1);
      const created = await createEvent();
      const { showcaseItemId, imageUrl } = created.body as {
        showcaseItemId: string;
        imageUrl: string;
      };
      expect(await statusOf(imageUrl)).toBe(200);

      await api().delete(`${EVENTS_PATH}/${showcaseItemId}`).expect(204);

      expect(await statusOf(imageUrl)).toBe(404);
    });

    it('apaga do bucket a imagem trocada no PATCH', async () => {
      const created = await createEvent();
      const { showcaseItemId, imageUrl: oldUrl } = created.body as {
        showcaseItemId: string;
        imageUrl: string;
      };
      const newUrl = await uploadImage();

      await api()
        .patch(`${EVENTS_PATH}/${showcaseItemId}`)
        .send({ imageUrl: newUrl })
        .expect(200);

      expect(await statusOf(oldUrl)).toBe(404);
      expect(await statusOf(newUrl)).toBe(200);
    });

    it('apaga um upload que nunca foi salvo em um evento', async () => {
      const abandonedUrl = await uploadImage();

      await createdId();

      expect(await statusOf(abandonedUrl)).toBe(404);
    });

    it('apara os espaços do título', async () => {
      const created = await createEvent({ title: `${E2E_PREFIX}Feira  ` });

      expect(created.status).toBe(201);
      expect((created.body as { title: string }).title).toBe(
        `${E2E_PREFIX}Feira`,
      );
    });

    it('devolve 404 ao buscar ou apagar um projeto pela rota de evento', async () => {
      const project = await dataSource.getRepository(ShowcaseItem).save({
        type: ShowcaseItemType.PortfolioProject,
        title: `${E2E_PREFIX}Portão`,
        description: 'Pintura de portão',
        imageUrl: await uploadImage(),
        category: `${E2E_PREFIX}Estrutura`,
        serviceType: 'Pintura epóxi',
        materials: 'Aço',
      });

      await api().get(`${EVENTS_PATH}/${project.showcaseItemId}`).expect(404);
      await api()
        .delete(`${EVENTS_PATH}/${project.showcaseItemId}`)
        .expect(404);
    });
  });

  describe('limites', () => {
    it('recusa com 409 o evento acima do máximo de 10, sem gravar', async () => {
      await fillEventsTo(MAX_EVENTS);

      const response = await createEvent({ title: `${E2E_PREFIX}Extra` });

      expect(response.status).toBe(409);
      expect((response.body as { message: string }).message).toBe(
        'A vitrine aceita no máximo 10 eventos.',
      );
      expect(await countEvents()).toBe(MAX_EVENTS);
    });
  });

  describe('dados inválidos', () => {
    it.each([
      ['imagem ausente', { imageUrl: undefined }],
      ['título nulo', { title: null }],
      ['descrição só com espaços', { description: '   ' }],
      ['data ausente', { eventDate: undefined }],
      ['data em formato inválido', { eventDate: '12/09/2026' }],
      ['data com hora', { eventDate: '2026-09-12T10:00:00Z' }],
      ['data inexistente', { eventDate: '2026-02-30' }],
      ['campo desconhecido', { unexpected: true }],
      ['imagem de outro site', { imageUrl: 'https://exemplo.com/evento.jpg' }],
      [
        'imagem de outra pasta do bucket',
        {
          imageUrl: `${process.env.S3_PUBLIC_URL}/visual/${UPLOADED_NAME}.png`,
        },
      ],
      [
        'imagem com parâmetros na URL',
        {
          imageUrl: `${process.env.S3_PUBLIC_URL}/showcase/${UPLOADED_NAME}.png?v=2`,
        },
      ],
    ])('recusa %s no POST com 400', async (_case, overrides) => {
      const response = await createEvent(overrides);

      expect(response.status).toBe(400);
    });

    it.each([
      ['no POST', 'post' as const],
      ['no PATCH', 'patch' as const],
    ])('explica em português o formato da data %s', async (_case, method) => {
      const path =
        method === 'post' ? EVENTS_PATH : `${EVENTS_PATH}/${await createdId()}`;

      const response = await api()
        [method](path)
        .send({ eventDate: '12/09/2026' })
        .expect(400);

      expect((response.body as { message: string[] }).message).toContain(
        'eventDate deve estar no formato YYYY-MM-DD (ex: 2026-09-12)',
      );
    });

    it.each([
      ['título nulo', { title: null }],
      ['imagem nula', { imageUrl: null }],
      ['data nula', { eventDate: null }],
      ['data inválida', { eventDate: 'ontem' }],
      ['data com hora', { eventDate: '2026-09-12T10:00:00Z' }],
      ['imagem de outro site', { imageUrl: 'https://exemplo.com/evento.jpg' }],
    ])('recusa %s no PATCH com 400', async (_case, body) => {
      const id = await createdId();

      await api().patch(`${EVENTS_PATH}/${id}`).send(body).expect(400);
    });

    it('devolve 400 para um id que não é UUID', async () => {
      await api().get(`${EVENTS_PATH}/abc`).expect(400);
    });
  });
});
