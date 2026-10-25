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
import {
  IMAGE_CLEANUP_GRACE_PERIOD_MS,
  StorageService,
} from '../src/storage/storage.service';
import { DEFAULT_VISUAL_SETTINGS } from '../src/site-settings/visual-settings';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// A name in the format the upload route generates.
const UPLOADED_NAME = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';

// Smallest byte sequences each format is recognized by.
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(32),
]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  Buffer.alloc(32),
]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);
const TEXT = Buffer.from('não sou uma imagem');

// The test runs where the public URL may not resolve (inside the backend
// container), so the image is read through the S3 endpoint, which serves the
// same public object.
function readableUrl(publicUrl: string): string {
  const bucketUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
  return publicUrl.replace(process.env.S3_PUBLIC_URL ?? '', bucketUrl);
}

describe('Configuração visual do site (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminEmployeeId: string;
  let adminToken: string;

  beforeAll(async () => {
    // Without the grace period, a publish deletes the images the test just
    // uploaded and left unused.
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
       VALUES ('Admin Visual', $1, $2, $3) RETURNING employee_id`,
      [email, await hashPassword(password), EmployeeRole.Admin],
    );
    adminEmployeeId = rows[0].employee_id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    adminToken = (loginRes.body as LoginResponseDto).accessToken;
  });

  // site_settings has a single row shared with the development database: its
  // visual settings are put back after the suite, and every test starts from
  // an untouched configuration.
  // Read as text, so a NULL column goes back as NULL and not as JSON null.
  let developmentVisualSettings: {
    published: string | null;
    draft: string | null;
  };

  beforeAll(async () => {
    const [row] = await dataSource.query<
      { published: string | null; draft: string | null }[]
    >(
      'SELECT visual_published::text AS published, visual_draft::text AS draft FROM site_settings',
    );
    developmentVisualSettings = row;
  });

  afterAll(async () => {
    await dataSource.query(
      'UPDATE site_settings SET visual_published = $1::jsonb, visual_draft = $2::jsonb',
      [developmentVisualSettings.published, developmentVisualSettings.draft],
    );
    await dataSource.query('DELETE FROM employees WHERE employee_id = $1', [
      adminEmployeeId,
    ]);
  });

  beforeEach(async () => {
    await dataSource.query(
      'UPDATE site_settings SET visual_published = NULL, visual_draft = NULL',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => {
    const server = request(app.getHttpServer());
    return {
      get: (url: string) =>
        server.get(url).set('Authorization', `Bearer ${adminToken}`),
      patch: (url: string) =>
        server.patch(url).set('Authorization', `Bearer ${adminToken}`),
      post: (url: string) =>
        server.post(url).set('Authorization', `Bearer ${adminToken}`),
    };
  };

  const uploadImage = (
    content: Buffer,
    filename: string,
    contentType: string,
  ) =>
    api()
      .post('/site-settings/visual/images')
      .attach('file', content, { filename, contentType });

  const uploadedUrl = async (filename: string) => {
    const response = await uploadImage(PNG, filename, 'image/png').expect(201);
    return (response.body as { url: string }).url;
  };
  const statusOf = async (url: string) =>
    (await fetch(readableUrl(url))).status;

  describe('upload de imagem', () => {
    it.each([
      ['PNG', PNG, 'logo.png', 'image/png', '.png'],
      ['JPEG', JPEG, 'banner.jpg', 'image/jpeg', '.jpg'],
      ['WebP', WEBP, 'banner.webp', 'image/webp', '.webp'],
    ])(
      'guarda uma imagem %s e devolve a URL pública',
      async (_format, content, filename, contentType, extension) => {
        const response = await uploadImage(
          content,
          filename,
          contentType,
        ).expect(201);

        const { url } = response.body as { url: string };
        expect(url.startsWith(`${process.env.S3_PUBLIC_URL}/visual/`)).toBe(
          true,
        );
        expect(url.endsWith(extension)).toBe(true);
        const stored = await fetch(readableUrl(url));
        expect(stored.status).toBe(200);
        expect(Buffer.from(await stored.arrayBuffer())).toEqual(content);
      },
    );

    it.each([
      ['GIF', GIF, 'logo.gif', 'image/gif'],
      ['SVG', SVG, 'logo.svg', 'image/svg+xml'],
      ['texto com extensão de PNG', TEXT, 'logo.png', 'image/png'],
    ])(
      'recusa %s informando os formatos aceitos',
      async (_case, content, filename, contentType) => {
        const response = await uploadImage(
          content,
          filename,
          contentType,
        ).expect(400);

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

      await uploadImage(content, 'grande.png', 'image/png').expect(
        expectedStatus,
      );
    });

    it('recusa a requisição sem arquivo', async () => {
      await api().post('/site-settings/visual/images').expect(400);
    });
  });

  describe('site público', () => {
    it('recebe a identidade padrão quando nada foi publicado', async () => {
      const response = await request(app.getHttpServer())
        .get('/site-settings/visual')
        .expect(200);

      expect(response.body).toEqual(DEFAULT_VISUAL_SETTINGS);
    });
  });

  describe('rascunho', () => {
    it('nasce como cópia do publicado', async () => {
      const response = await api()
        .get('/site-settings/visual/draft')
        .expect(200);

      expect(response.body).toEqual(DEFAULT_VISUAL_SETTINGS);
    });

    it('muda só a cor enviada e mantém o resto da configuração', async () => {
      await api()
        .patch('/site-settings/visual/draft')
        .send({ colors: { accent: '#3b82f6' } })
        .expect(200);
      const response = await api()
        .patch('/site-settings/visual/draft')
        .send({ logo: { text: 'ACME' } })
        .expect(200);

      expect(response.body).toEqual({
        ...DEFAULT_VISUAL_SETTINGS,
        colors: { ...DEFAULT_VISUAL_SETTINGS.colors, accent: '#3b82f6' },
        logo: { ...DEFAULT_VISUAL_SETTINGS.logo, text: 'ACME' },
      });
    });

    it.each([
      ['cor sem #', { colors: { accent: 'e9b421' } }],
      ['cor com 3 dígitos', { colors: { text: '#fff' } }],
      ['cor por nome', { colors: { pageBackground: 'black' } }],
      [
        'texto do logotipo com 21 caracteres',
        { logo: { text: 'A'.repeat(21) } },
      ],
      [
        'chamada do banner com 41 caracteres',
        { banner: { eyebrow: 'A'.repeat(41) } },
      ],
      [
        'título do banner com 61 caracteres',
        { banner: { title: 'A'.repeat(61) } },
      ],
      [
        'texto em destaque com 41 caracteres',
        { banner: { highlight: 'A'.repeat(41) } },
      ],
      [
        'descrição do banner com 301 caracteres',
        { banner: { description: 'A'.repeat(301) } },
      ],
      [
        'título de seção com 61 caracteres',
        { sectionTitles: { contact: 'A'.repeat(61) } },
      ],
      [
        'descrição de eventos com 301 caracteres',
        { eventsHeader: { description: 'A'.repeat(301) } },
      ],
      ['campo que não existe', { theme: 'Ouro' }],
      ['cor nula', { colors: { accent: null } }],
      ['título do banner nulo', { banner: { title: null } }],
    ])('recusa %s com 400', async (_case, patch) => {
      await api().patch('/site-settings/visual/draft').send(patch).expect(400);

      const response = await api()
        .get('/site-settings/visual/draft')
        .expect(200);
      expect(response.body).toEqual(DEFAULT_VISUAL_SETTINGS);
    });

    it.each([
      [
        'texto do logotipo com 20 caracteres',
        { logo: { text: 'A'.repeat(20) } },
      ],
      [
        'descrição do banner com 300 caracteres',
        { banner: { description: 'A'.repeat(300) } },
      ],
      ['cor em maiúsculas', { colors: { accent: '#E9B421' } }],
    ])('aceita %s', async (_case, patch) => {
      await api().patch('/site-settings/visual/draft').send(patch).expect(200);
    });

    it.each([
      ['de outro site', 'logo', 'https://images.unsplash.com/photo.png'],
      [
        'de outra pasta do bucket',
        'banner',
        `${process.env.S3_PUBLIC_URL}/portfolio/foto.png`,
      ],
      [
        'que sai da pasta com ..',
        'banner',
        `${process.env.S3_PUBLIC_URL}/visual/../portfolio/foto.png`,
      ],
      [
        'com nome que o upload não gera',
        'logo',
        `${process.env.S3_PUBLIC_URL}/visual/logo.png`,
      ],
      [
        'com extensão não aceita',
        'logo',
        `${process.env.S3_PUBLIC_URL}/visual/${UPLOADED_NAME}.gif`,
      ],
      [
        'com parâmetros na URL',
        'logo',
        `${process.env.S3_PUBLIC_URL}/visual/${UPLOADED_NAME}.png?v=2`,
      ],
    ])('recusa imagem %s no %s com 400', async (_case, group, imageUrl) => {
      await api()
        .patch('/site-settings/visual/draft')
        .send({ [group]: { imageUrl } })
        .expect(400);
    });

    it.each([
      ['logo', 'logo.png'],
      ['banner', 'banner.png'],
    ])(
      'salva no %s a imagem enviada e depois a remove',
      async (group, filename) => {
        const upload = await uploadImage(PNG, filename, 'image/png').expect(
          201,
        );
        const { url } = upload.body as { url: string };

        const saved = await api()
          .patch('/site-settings/visual/draft')
          .send({ [group]: { imageUrl: url } })
          .expect(200);
        expect(
          (saved.body as Record<string, { imageUrl: string }>)[group].imageUrl,
        ).toBe(url);

        const removed = await api()
          .patch('/site-settings/visual/draft')
          .send({ [group]: { imageUrl: null } })
          .expect(200);
        expect(
          (removed.body as Record<string, { imageUrl: null }>)[group].imageUrl,
        ).toBeNull();
      },
    );

    it('mantém todas as mudanças de PATCHes simultâneos em grupos diferentes', async () => {
      const patches = [
        { colors: { accent: '#22c55e' } },
        { logo: { text: 'ACME' } },
        { banner: { title: 'Título novo' } },
        { sectionTitles: { contact: 'Fale conosco' } },
        { eventsHeader: { title: 'Agenda' } },
      ];

      await Promise.all(
        patches.map((patch) =>
          api().patch('/site-settings/visual/draft').send(patch).expect(200),
        ),
      );

      const response = await api()
        .get('/site-settings/visual/draft')
        .expect(200);
      expect(response.body).toEqual({
        ...DEFAULT_VISUAL_SETTINGS,
        colors: { ...DEFAULT_VISUAL_SETTINGS.colors, accent: '#22c55e' },
        logo: { ...DEFAULT_VISUAL_SETTINGS.logo, text: 'ACME' },
        banner: { ...DEFAULT_VISUAL_SETTINGS.banner, title: 'Título novo' },
        sectionTitles: {
          ...DEFAULT_VISUAL_SETTINGS.sectionTitles,
          contact: 'Fale conosco',
        },
        eventsHeader: {
          ...DEFAULT_VISUAL_SETTINGS.eventsHeader,
          title: 'Agenda',
        },
      });
    });

    it('não muda o site público antes de publicar', async () => {
      await api()
        .patch('/site-settings/visual/draft')
        .send({ banner: { title: 'Título novo' } })
        .expect(200);

      const response = await api().get('/site-settings/visual').expect(200);
      expect(response.body).toEqual(DEFAULT_VISUAL_SETTINGS);
    });
  });

  describe('publicação', () => {
    it('aplica ao site público a configuração salva no rascunho', async () => {
      const draft = await api()
        .patch('/site-settings/visual/draft')
        .send({
          colors: { accent: '#22c55e' },
          banner: { title: 'Pintura que protege' },
        })
        .expect(200);

      await api().post('/site-settings/visual/publish').expect(201);

      const published = await api().get('/site-settings/visual').expect(200);
      expect(published.body).toEqual(draft.body);
    });

    it('mantém o rascunho depois de publicar', async () => {
      const draft = await api()
        .patch('/site-settings/visual/draft')
        .send({ logo: { text: 'ACME' } })
        .expect(200);

      await api().post('/site-settings/visual/publish').expect(201);

      const afterPublish = await api()
        .get('/site-settings/visual/draft')
        .expect(200);
      expect(afterPublish.body).toEqual(draft.body);
    });

    it('apaga o upload que não foi usado e mantém a imagem do rascunho', async () => {
      const abandonedUrl = await uploadedUrl('abandonada.png');
      const logoUrl = await uploadedUrl('logo.png');
      await api()
        .patch('/site-settings/visual/draft')
        .send({ logo: { imageUrl: logoUrl } })
        .expect(200);

      await api().post('/site-settings/visual/publish').expect(201);

      expect(await statusOf(abandonedUrl)).toBe(404);
      expect(await statusOf(logoUrl)).toBe(200);
    });

    it('apaga a imagem de banner trocada depois que a nova é publicada', async () => {
      const oldBannerUrl = await uploadedUrl('banner-antigo.png');
      await api()
        .patch('/site-settings/visual/draft')
        .send({ banner: { imageUrl: oldBannerUrl } })
        .expect(200);
      await api().post('/site-settings/visual/publish').expect(201);
      const newBannerUrl = await uploadedUrl('banner-novo.png');
      await api()
        .patch('/site-settings/visual/draft')
        .send({ banner: { imageUrl: newBannerUrl } })
        .expect(200);

      await api().post('/site-settings/visual/publish').expect(201);

      expect(await statusOf(oldBannerUrl)).toBe(404);
      expect(await statusOf(newBannerUrl)).toBe(200);
    });

    it.each([
      ['listar as imagens', 'listFiles' as const],
      ['apagar as imagens', 'deleteMany' as const],
    ])(
      'publica mesmo quando o bucket falha ao %s',
      async (_case, failingOperation) => {
        await uploadedUrl('sem-uso.png');
        jest
          .spyOn(app.get(StorageService), failingOperation)
          .mockRejectedValue(new Error('bucket fora do ar'));
        const draft = await api()
          .patch('/site-settings/visual/draft')
          .send({ colors: { accent: '#ef4444' } })
          .expect(200);

        await api().post('/site-settings/visual/publish').expect(201);

        const published = await api().get('/site-settings/visual').expect(200);
        expect(published.body).toEqual(draft.body);
      },
    );

    it('publica a identidade padrão quando nada foi editado', async () => {
      const response = await api()
        .post('/site-settings/visual/publish')
        .expect(201);

      expect(response.body).toEqual(DEFAULT_VISUAL_SETTINGS);
    });
  });

  describe('descarte do rascunho', () => {
    it.each([
      ['há uma configuração publicada', { logo: { text: 'ACME' } }],
      ['nada foi publicado', null],
    ])(
      'volta o rascunho a ser igual ao publicado quando %s',
      async (_published, publishedPatch) => {
        if (publishedPatch !== null) {
          await api()
            .patch('/site-settings/visual/draft')
            .send(publishedPatch)
            .expect(200);
          await api().post('/site-settings/visual/publish').expect(201);
        }
        await api()
          .patch('/site-settings/visual/draft')
          .send({ colors: { accent: '#ef4444' } })
          .expect(200);
        const published = await api().get('/site-settings/visual').expect(200);

        const discarded = await api()
          .post('/site-settings/visual/draft/discard')
          .expect(201);

        expect(discarded.body).toEqual(published.body);
        const draft = await api()
          .get('/site-settings/visual/draft')
          .expect(200);
        expect(draft.body).toEqual(published.body);
      },
    );

    it('apaga a imagem que só o rascunho usava e mantém a publicada', async () => {
      const publishedLogoUrl = await uploadedUrl('logo-publicado.png');
      await api()
        .patch('/site-settings/visual/draft')
        .send({ logo: { imageUrl: publishedLogoUrl } })
        .expect(200);
      await api().post('/site-settings/visual/publish').expect(201);
      const draftLogoUrl = await uploadedUrl('logo-rascunho.png');
      await api()
        .patch('/site-settings/visual/draft')
        .send({ logo: { imageUrl: draftLogoUrl } })
        .expect(200);

      await api().post('/site-settings/visual/draft/discard').expect(201);

      expect(await statusOf(draftLogoUrl)).toBe(404);
      expect(await statusOf(publishedLogoUrl)).toBe(200);
    });
  });

  describe('restauração do padrão', () => {
    it('volta o site público à identidade padrão na hora', async () => {
      await api()
        .patch('/site-settings/visual/draft')
        .send({ colors: { accent: '#22c55e' }, logo: { text: 'ACME' } })
        .expect(200);
      await api().post('/site-settings/visual/publish').expect(201);

      const restored = await api()
        .post('/site-settings/visual/restore-default')
        .expect(201);

      expect(restored.body).toEqual(DEFAULT_VISUAL_SETTINGS);
      const published = await api().get('/site-settings/visual').expect(200);
      expect(published.body).toEqual(DEFAULT_VISUAL_SETTINGS);
    });

    it.each([
      ['uma vez', 1],
      ['duas vezes seguidas', 2],
    ])(
      'descarta o rascunho não publicado ao restaurar %s',
      async (_times, restoreCount) => {
        await api()
          .patch('/site-settings/visual/draft')
          .send({ banner: { title: 'Título não publicado' } })
          .expect(200);

        for (let count = 0; count < restoreCount; count++) {
          await api().post('/site-settings/visual/restore-default').expect(201);
        }

        const draft = await api()
          .get('/site-settings/visual/draft')
          .expect(200);
        expect(draft.body).toEqual(DEFAULT_VISUAL_SETTINGS);
      },
    );

    it('apaga do bucket as imagens publicadas e as do rascunho', async () => {
      const publishedLogoUrl = await uploadedUrl('logo-publicado.png');
      await api()
        .patch('/site-settings/visual/draft')
        .send({ logo: { imageUrl: publishedLogoUrl } })
        .expect(200);
      await api().post('/site-settings/visual/publish').expect(201);
      const draftBannerUrl = await uploadedUrl('banner-rascunho.png');
      await api()
        .patch('/site-settings/visual/draft')
        .send({ banner: { imageUrl: draftBannerUrl } })
        .expect(200);

      await api().post('/site-settings/visual/restore-default').expect(201);

      expect(await statusOf(publishedLogoUrl)).toBe(404);
      expect(await statusOf(draftBannerUrl)).toBe(404);
    });
  });

  describe('falha do bucket ao descartar ou restaurar', () => {
    it.each([
      ['descarta o rascunho', '/site-settings/visual/draft/discard'],
      ['restaura o padrão', '/site-settings/visual/restore-default'],
    ])('%s mesmo com o bucket fora do ar', async (_action, path) => {
      await api()
        .patch('/site-settings/visual/draft')
        .send({ colors: { accent: '#ef4444' } })
        .expect(200);
      jest
        .spyOn(app.get(StorageService), 'deleteMany')
        .mockRejectedValue(new Error('bucket fora do ar'));

      await api().post(path).expect(201);

      const draft = await api().get('/site-settings/visual/draft').expect(200);
      expect(draft.body).toEqual(DEFAULT_VISUAL_SETTINGS);
    });
  });

  describe('sem o registro de configurações', () => {
    // The migration seeds the single row; the test removes it and puts the
    // same row back, so the development database keeps its id and values.
    let removedRow: string;

    beforeEach(async () => {
      const [row] = await dataSource.query<{ row: string }[]>(
        'SELECT row_to_json(site_settings)::text AS row FROM site_settings',
      );
      removedRow = row.row;
      await dataSource.query('DELETE FROM site_settings');
    });

    afterEach(async () => {
      await dataSource.query(
        'INSERT INTO site_settings SELECT * FROM json_populate_record(NULL::site_settings, $1::json)',
        [removedRow],
      );
    });

    it.each([
      ['ler o publicado', () => api().get('/site-settings/visual')],
      [
        'salvar o rascunho',
        () =>
          api()
            .patch('/site-settings/visual/draft')
            .send({ logo: { text: 'ACME' } }),
      ],
      ['publicar', () => api().post('/site-settings/visual/publish')],
    ])('responde 500 com erro claro ao %s', async (_case, sendRequest) => {
      const response = await sendRequest().expect(500);

      expect((response.body as { message: string }).message).toBe(
        'Registro de configurações do site não encontrado; rode as migrations.',
      );
    });
  });
});
