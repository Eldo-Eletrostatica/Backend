import { findUnusedImageKeys, StoredImage } from './unused-images';

const PUBLIC_URL = 'http://localhost:8333/eldo';
const NOW = new Date('2026-10-20T12:00:00Z');
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_HOURS_AGO = new Date('2026-10-20T10:00:00Z');

const oldImages = (...keys: string[]): StoredImage[] =>
  keys.map((key) => ({ key, uploadedAt: TWO_HOURS_AGO }));

describe('findUnusedImageKeys', () => {
  it.each([
    [
      'apaga o logotipo trocado e mantém o atual',
      oldImages('visual/old-logo.png', 'visual/new-logo.png'),
      [`${PUBLIC_URL}/visual/new-logo.png`],
      ['visual/old-logo.png'],
    ],
    [
      'apaga um upload antigo que nunca foi salvo',
      oldImages('visual/logo.png', 'visual/abandoned.webp'),
      [`${PUBLIC_URL}/visual/logo.png`],
      ['visual/abandoned.webp'],
    ],
    [
      'mantém imagens usadas no rascunho ou no publicado',
      oldImages('visual/draft.png', 'visual/published.png'),
      [`${PUBLIC_URL}/visual/draft.png`, `${PUBLIC_URL}/visual/published.png`],
      [],
    ],
    [
      'apaga tudo quando nenhuma imagem é usada',
      oldImages('visual/a.png', 'visual/b.jpg'),
      [null, null],
      ['visual/a.png', 'visual/b.jpg'],
    ],
    [
      'não apaga nada com o bucket vazio',
      [],
      [`${PUBLIC_URL}/visual/a.png`],
      [],
    ],
    [
      'mantém um upload sem uso enviado há menos de 1 hora',
      [
        {
          key: 'visual/just-sent.png',
          uploadedAt: new Date('2026-10-20T11:30:00Z'),
        },
        ...oldImages('visual/abandoned.png'),
      ],
      [null],
      ['visual/abandoned.png'],
    ],
    [
      'apaga um upload sem uso enviado há exatamente 1 hora',
      [
        {
          key: 'visual/one-hour.png',
          uploadedAt: new Date('2026-10-20T11:00:00Z'),
        },
      ],
      [null],
      ['visual/one-hour.png'],
    ],
  ])('%s', (_case, storedImages, usedUrls, expected) => {
    expect(
      findUnusedImageKeys(storedImages, usedUrls, PUBLIC_URL, NOW, ONE_HOUR_MS),
    ).toEqual(expected);
  });
});
