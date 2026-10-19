import { numericTransformer } from './numeric.transformer';

describe('numericTransformer', () => {
  it.each([
    ['12.50', 12.5],
    ['0.000', 0],
  ])('converte %s vindo do banco para o número %d', (raw, expected) => {
    expect(numericTransformer.from(raw)).toBe(expected);
  });

  it.each([
    [null, null],
    [undefined, null],
  ])('converte %s vindo do banco para %s', (raw, expected) => {
    expect(numericTransformer.from(raw)).toBe(expected);
  });

  it.each([
    [12.5, 12.5],
    [null, null],
  ])('grava %s sem alterar o valor', (value, expected) => {
    expect(numericTransformer.to(value)).toBe(expected);
  });
});
