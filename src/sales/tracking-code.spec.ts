import { TRACKING_CODE_LENGTH } from '../orders/entities/order.entity';
import { generateTrackingCode, TRACKING_CODE_ALPHABET } from './tracking-code';

// Enough codes for every alphabet symbol to show up many times.
const SAMPLE_SIZE = 500;

describe('generateTrackingCode', () => {
  const codes = Array.from({ length: SAMPLE_SIZE }, generateTrackingCode);

  it('gera códigos do tamanho do protocolo, só com o alfabeto da ADR 0001', () => {
    for (const code of codes) {
      expect(code).toHaveLength(TRACKING_CODE_LENGTH);
      expect(
        [...code].every((char) => TRACKING_CODE_ALPHABET.includes(char)),
      ).toBe(true);
    }
  });

  it.each([
    ['0', 'a letra O'],
    ['O', 'o número 0'],
    ['1', 'a letra I'],
    ['I', 'o número 1'],
  ])('nunca usa %s, que se confunde com %s', (char) => {
    expect(codes.join('')).not.toContain(char);
  });
});
