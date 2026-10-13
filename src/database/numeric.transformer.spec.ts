import { numericTransformer } from './numeric.transformer';

describe('numericTransformer', () => {
  it.each([
    ['12.50', 12.5],
    ['0.000', 0],
  ])('converte %s vindo do banco para o número %d', (raw, expected) => {
    expect(numericTransformer.from(raw)).toBe(expected);
  });

  it.each([[null], [undefined]])('mantém %s vindo do banco', (raw) => {
    expect(numericTransformer.from(raw)).toBeNull();
  });

  it.each([
    [12.5, 12.5],
    [null, null],
  ])('grava %s sem alterar o valor', (value, expected) => {
    expect(numericTransformer.to(value)).toBe(expected);
  });
});
