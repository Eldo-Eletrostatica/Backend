import { Transform } from 'class-transformer';

// "Estrutura Metálica " and "Estrutura Metálica" must be the same category.
export const TrimString = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
