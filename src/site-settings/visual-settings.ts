// Text limits about 1.5 times the longest text of the prototype, so the fixed
// layout of the site still fits them.
export const LOGO_TEXT_MAX_LENGTH = 20;
export const EYEBROW_MAX_LENGTH = 40;
export const TITLE_MAX_LENGTH = 60;
export const HIGHLIGHT_MAX_LENGTH = 40;
export const DESCRIPTION_MAX_LENGTH = 300;

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export interface VisualSettings {
  colors: {
    accent: string;
    pageBackground: string;
    cardBackground: string;
    text: string;
  };
  logo: {
    text: string;
    imageUrl: string | null;
  };
  banner: {
    eyebrow: string;
    title: string;
    highlight: string;
    description: string;
    imageUrl: string | null;
  };
  sectionTitles: {
    portfolio: string;
    reviews: string;
    contact: string;
  };
  eventsHeader: {
    eyebrow: string;
    title: string;
    description: string;
  };
}

// Each group may be sent partially: only the fields present change.
export type VisualSettingsPatch = {
  [Group in keyof VisualSettings]?: Partial<VisualSettings[Group]>;
};

// The Eldo identity of the prototype. Empty images make the site show the logo
// bundled in the Frontend.
export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  colors: {
    accent: '#e9b421',
    pageBackground: '#12100d',
    cardBackground: '#171511',
    text: '#f5f2ec',
  },
  logo: {
    text: 'ELDO',
    imageUrl: null,
  },
  banner: {
    eyebrow: 'PINTURA ELETROSTÁTICA A PÓ',
    title: 'Acabamento que resiste',
    highlight: 'ao tempo.',
    description:
      'Especialistas em pintura eletrostática a pó para estruturas metálicas, portões, máquinas e mobiliário industrial. Mais de 15 anos recuperando e protegendo metal com precisão industrial.',
    imageUrl: null,
  },
  sectionTitles: {
    portfolio: 'Trabalhos realizados',
    reviews: 'O que dizem quem já contratou',
    contact: 'Peça seu orçamento sem compromisso',
  },
  eventsHeader: {
    eyebrow: 'AÇÕES E EVENTOS',
    title: 'Onde a Eldo esteve',
    description:
      'Feiras do setor, visitas técnicas e ações de formação. Registro público das atividades da empresa fora da fábrica.',
  },
};

export function applyVisualSettingsPatch(
  settings: VisualSettings,
  patch: VisualSettingsPatch,
): VisualSettings {
  return {
    colors: mergeGroup(settings.colors, patch.colors),
    logo: mergeGroup(settings.logo, patch.logo),
    banner: mergeGroup(settings.banner, patch.banner),
    sectionTitles: mergeGroup(settings.sectionTitles, patch.sectionTitles),
    eventsHeader: mergeGroup(settings.eventsHeader, patch.eventsHeader),
  };
}

// The validated DTO keeps the fields that were not sent as undefined, so only
// defined values overwrite; null is a value and clears an image.
function mergeGroup<Group extends object>(
  group: Group,
  patch: Partial<Group> | undefined,
): Group {
  const definedEntries = Object.entries(patch ?? {}).filter(
    ([, value]) => value !== undefined,
  );
  return { ...group, ...Object.fromEntries(definedEntries) };
}

// Every image field of the settings, so the cleanup never misses one.
export function imageUrlsOf(settings: VisualSettings): (string | null)[] {
  return [settings.logo.imageUrl, settings.banner.imageUrl];
}
