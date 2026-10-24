import {
  applyVisualSettingsPatch,
  DEFAULT_VISUAL_SETTINGS,
  imageUrlsOf,
  VisualSettings,
} from './visual-settings';

const CUSTOMIZED: VisualSettings = {
  colors: {
    accent: '#3b82f6',
    pageBackground: '#0c1220',
    cardBackground: '#111827',
    text: '#ffffff',
  },
  logo: { text: 'ACME', imageUrl: 'http://bucket/visual/logo.png' },
  banner: {
    eyebrow: 'PINTURA A PÓ',
    title: 'Proteção que dura',
    highlight: 'anos.',
    description: 'Descrição do banner.',
    imageUrl: 'http://bucket/visual/banner.png',
  },
  sectionTitles: {
    portfolio: 'Nossos trabalhos',
    reviews: 'Avaliações',
    contact: 'Fale conosco',
  },
  eventsHeader: {
    eyebrow: 'EVENTOS',
    title: 'Por onde passamos',
    description: 'Descrição dos eventos.',
  },
};

describe('applyVisualSettingsPatch', () => {
  it.each([
    [
      'só a cor de destaque',
      { colors: { accent: '#ef4444' } },
      { ...CUSTOMIZED, colors: { ...CUSTOMIZED.colors, accent: '#ef4444' } },
    ],
    [
      'só o texto do logotipo',
      { logo: { text: 'NOVA' } },
      { ...CUSTOMIZED, logo: { ...CUSTOMIZED.logo, text: 'NOVA' } },
    ],
    [
      'a remoção da imagem do banner',
      { banner: { imageUrl: null } },
      { ...CUSTOMIZED, banner: { ...CUSTOMIZED.banner, imageUrl: null } },
    ],
    ['nada', {}, CUSTOMIZED],
    [
      'campos não enviados como undefined',
      { colors: { accent: '#ef4444', text: undefined }, logo: undefined },
      { ...CUSTOMIZED, colors: { ...CUSTOMIZED.colors, accent: '#ef4444' } },
    ],
  ])('ao receber %s, muda só o que veio no PATCH', (_case, patch, expected) => {
    expect(applyVisualSettingsPatch(CUSTOMIZED, patch)).toEqual(expected);
  });

  it.each([
    ['vazio', {}],
    ['com uma cor', { colors: { text: '#000000' } }],
  ])(
    'não altera a configuração original ao aplicar um PATCH %s',
    (_case, patch) => {
      const original = structuredClone(CUSTOMIZED);
      applyVisualSettingsPatch(CUSTOMIZED, patch);
      expect(CUSTOMIZED).toEqual(original);
    },
  );
});

describe('DEFAULT_VISUAL_SETTINGS', () => {
  it.each([
    ['cor de destaque', DEFAULT_VISUAL_SETTINGS.colors.accent, '#e9b421'],
    ['texto do logotipo', DEFAULT_VISUAL_SETTINGS.logo.text, 'ELDO'],
    ['imagem do logotipo', DEFAULT_VISUAL_SETTINGS.logo.imageUrl, null],
    ['imagem do banner', DEFAULT_VISUAL_SETTINGS.banner.imageUrl, null],
  ])('usa a identidade do protótipo em %s', (_case, value, expected) => {
    expect(value).toBe(expected);
  });
});

describe('imageUrlsOf', () => {
  it.each([
    [
      'configuração com imagens',
      CUSTOMIZED,
      ['http://bucket/visual/logo.png', 'http://bucket/visual/banner.png'],
    ],
    ['identidade padrão', DEFAULT_VISUAL_SETTINGS, [null, null]],
  ])('lista as imagens da %s', (_case, settings, expected) => {
    expect(imageUrlsOf(settings)).toEqual(expected);
  });
});
